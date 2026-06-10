//! Prompt Builder + Context Summarizer.
//!
//! Builds system prompts enriched with project context so the LLM understands
//! the current workspace, files, board target, and any diagnostics. Stays
//! within a configurable token budget per provider/model.

use crate::ai::{ChatMessage, ChatRole};
use crate::app_state::AppState;
use crate::schema::Project;
use serde::{Deserialize, Serialize};

/// Pre-built persona system prompts. Each persona defines the tone, expertise
/// level, and tool-allowlist for the AI.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Persona {
    pub id: String,
    pub name: String,
    pub description: String,
    pub system_prompt: String,
}

impl Persona {
    pub fn builtins() -> Vec<Persona> {
        vec![
            Persona {
                id: "engineer".into(),
                name: "Engineer".into(),
                description: "Direct, concise answers with code and schematics. Maximum efficiency.".into(),
                system_prompt: concat!(
                    "You are an expert hardware and embedded systems engineer using Forge, an AI-native hardware IDE.\n",
                    "You have read/write access to the project: CAD, circuit schematics, PCB layout, firmware code, and BOM.\n",
                    "Be direct and precise. Prefer code, schematics, and structured actions over long explanations.\n",
                    "When the user asks for changes, propose concrete, minimal, and correct modifications.\n",
                    "Always consider board constraints, power budgets, signal integrity, and manufacturing.\n",
                ).into(),
            },
            Persona {
                id: "mentor".into(),
                name: "Mentor".into(),
                description: "Patient teacher who explains concepts and walks through designs step by step.".into(),
                system_prompt: concat!(
                    "You are a patient and encouraging hardware engineering mentor using Forge, an AI-native hardware IDE.\n",
                    "You have read/write access to the project: CAD, circuit schematics, PCB layout, firmware code, and BOM.\n",
                    "Explain concepts clearly. When the user is stuck, guide them rather than giving the answer outright.\n",
                    "Use analogies where helpful. Break complex designs into manageable steps.\n",
                    "Always explain *why* a design choice matters, not just *what* to do.\n",
                    "Encourage best practices: pull-up/down resistors, decoupling capacitors, proper grounding, and clean routing.\n",
                ).into(),
            },
            Persona {
                id: "student".into(),
                name: "Student Helper".into(),
                description: "Simplified explanations for learners. Focuses on fundamentals and safety.".into(),
                system_prompt: concat!(
                    "You are a friendly hardware engineering tutor for students and beginners using Forge, an AI-native hardware IDE.\n",
                    "You have read/write access to the project: CAD, circuit schematics, PCB layout, firmware code, and BOM.\n",
                    "Use simple language. Define technical terms when you introduce them.\n",
                    "Focus on fundamentals: Ohm's law, basic components, breadboarding, safe voltages, and simple Arduino programs.\n",
                    "Always warn about safety: high voltages, polarity, heat dissipation, and ESD.\n",
                    "Encourage testing on breadboards before PCB fabrication.\n",
                ).into(),
            },
        ]
    }

    pub fn by_id(id: &str) -> Option<Persona> {
        Self::builtins().into_iter().find(|p| p.id == id)
    }
}

/// Context fed into the prompt builder. Gathered from app state + project.
#[derive(Debug, Clone)]
pub struct ProjectContext {
    pub project: Option<Project>,
    pub board_target: Option<String>,
    pub ai_persona: String,
    pub open_files: Vec<String>,
    pub diagnostics_count: usize,
    pub recent_changes: Vec<String>,
}

/// Build a system prompt that includes persona + project context, staying
/// within a rough token budget.
pub fn build_system_prompt(ctx: &ProjectContext, persona: &Persona) -> String {
    let mut parts: Vec<String> = Vec::new();

    // 1. Persona system prompt
    parts.push(persona.system_prompt.clone());

    // 2. Project context (if a project is active)
    if let Some(ref proj) = ctx.project {
        parts.push(format!(
            "Current project: \"{}\" (board target: {}, units: {})",
            proj.name,
            ctx.board_target.as_deref().unwrap_or("not set"),
            proj.units
        ));
    }

    // 3. Open files
    if !ctx.open_files.is_empty() {
        let file_list = ctx
            .open_files
            .iter()
            .take(10) // don't blow token budget
            .map(|f| format!("  - {f}"))
            .collect::<Vec<_>>()
            .join("\n");
        parts.push(format!("Open files:\n{file_list}"));
    }

    // 4. Diagnostics snapshot
    if ctx.diagnostics_count > 0 {
        parts.push(format!(
            "Note: there are {} active diagnostics/warnings in the project.",
            ctx.diagnostics_count
        ));
    }

    // 5. Recent changes
    if !ctx.recent_changes.is_empty() {
        let changes = ctx
            .recent_changes
            .iter()
            .rev()
            .take(5)
            .cloned()
            .collect::<Vec<_>>()
            .join("\n");
        parts.push(format!("Recent changes:\n{changes}"));
    }

    parts.join("\n\n")
}

/// Gather project context from app state (used before sending an AI request).
pub fn gather_context(state: &AppState) -> ProjectContext {
    let active = state.active();
    let diagnostics = state.diagnostics();

    ProjectContext {
        project: active.as_ref().map(|a| a.project.clone()),
        board_target: active.as_ref().and_then(|a| a.project.board_target.clone()),
        ai_persona: active
            .as_ref()
            .map(|a| a.project.ai_persona.clone())
            .unwrap_or_else(|| "engineer".into()),
        open_files: Vec::new(), // populated by frontend along with ChatRequest
        diagnostics_count: diagnostics.len(),
        recent_changes: Vec::new(), // populated from event_log as needed
    }
}

/// Trim conversation history to stay within a rough token limit while keeping
/// the most recent messages and the system prompt.
pub fn trim_history(messages: &[ChatMessage], max_recent: usize) -> Vec<ChatMessage> {
    if messages.len() <= max_recent {
        return messages.to_vec();
    }

    let mut trimmed: Vec<ChatMessage> = Vec::new();

    // Keep system messages at the start
    for msg in messages {
        if msg.role == ChatRole::System {
            trimmed.push(msg.clone());
        }
    }

    // Keep the most recent N messages (excluding system)
    let non_system: Vec<&ChatMessage> = messages
        .iter()
        .filter(|m| m.role != ChatRole::System)
        .collect();

    let skip = if non_system.len() > max_recent {
        non_system.len() - max_recent
    } else {
        0
    };

    for msg in non_system.iter().skip(skip) {
        trimmed.push((*msg).clone());
    }

    trimmed
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builtin_personas_exist() {
        let personas = Persona::builtins();
        assert_eq!(personas.len(), 3);
        assert!(Persona::by_id("engineer").is_some());
        assert!(Persona::by_id("mentor").is_some());
        assert!(Persona::by_id("student").is_some());
        assert!(Persona::by_id("nonexistent").is_none());
    }

    #[test]
    fn system_prompt_includes_persona_and_context() {
        let ctx = ProjectContext {
            project: Some(Project::new("p1", "Temperature Monitor", 1_700_000_000)),
            board_target: Some("uno".into()),
            ai_persona: "engineer".into(),
            open_files: vec!["src/main.ino".into(), "lib/sensor.h".into()],
            diagnostics_count: 3,
            recent_changes: vec!["updated main.ino".into()],
        };
        let persona = Persona::by_id("engineer").unwrap();
        let prompt = build_system_prompt(&ctx, &persona);

        assert!(prompt.contains("expert hardware"));
        assert!(prompt.contains("Temperature Monitor"));
        assert!(prompt.contains("uno"));
        assert!(prompt.contains("src/main.ino"));
        assert!(prompt.contains("3 active diagnostics"));
    }

    #[test]
    fn trim_history_keeps_system_and_recent() {
        let msgs = vec![
            ChatMessage {
                role: ChatRole::System,
                content: "system prompt".into(),
            },
            ChatMessage {
                role: ChatRole::User,
                content: "msg1".into(),
            },
            ChatMessage {
                role: ChatRole::User,
                content: "msg2".into(),
            },
            ChatMessage {
                role: ChatRole::User,
                content: "msg3".into(),
            },
            ChatMessage {
                role: ChatRole::User,
                content: "msg4".into(),
            },
        ];

        let trimmed = trim_history(&msgs, 2);
        assert_eq!(trimmed.len(), 3); // system + 2 recent
        assert_eq!(trimmed[0].role, ChatRole::System);
        assert_eq!(trimmed[1].content, "msg3");
        assert_eq!(trimmed[2].content, "msg4");
    }

    #[test]
    fn empty_context_works() {
        let ctx = ProjectContext {
            project: None,
            board_target: None,
            ai_persona: "engineer".into(),
            open_files: vec![],
            diagnostics_count: 0,
            recent_changes: vec![],
        };
        let persona = Persona::by_id("engineer").unwrap();
        let prompt = build_system_prompt(&ctx, &persona);
        assert!(prompt.contains("expert hardware"));
        assert!(!prompt.contains("Current project")); // no active project
    }
}
