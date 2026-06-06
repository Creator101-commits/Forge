//! Board profile catalog.
//!
//! A small, static set of common MCU boards. A project stores its selected
//! board in `Project.board_target`; the user's preferred default lives in
//! `Settings.default_board`. Toolchain wiring (FQBN, upload protocol) is
//! consumed by the compile/upload milestone (M9).

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../src/types/generated/")]
pub struct BoardProfile {
    pub id: String,
    pub name: String,
    pub mcu: String,
    #[ts(type = "number")]
    pub default_baud: u32,
    /// Arduino fully-qualified board name, where applicable.
    pub fqbn: Option<String>,
}

fn p(id: &str, name: &str, mcu: &str, baud: u32, fqbn: Option<&str>) -> BoardProfile {
    BoardProfile {
        id: id.into(),
        name: name.into(),
        mcu: mcu.into(),
        default_baud: baud,
        fqbn: fqbn.map(|s| s.into()),
    }
}

/// The built-in board catalog.
pub fn catalog() -> Vec<BoardProfile> {
    vec![
        p(
            "uno",
            "Arduino Uno",
            "ATmega328P",
            9600,
            Some("arduino:avr:uno"),
        ),
        p(
            "nano",
            "Arduino Nano",
            "ATmega328P",
            9600,
            Some("arduino:avr:nano"),
        ),
        p(
            "mega",
            "Arduino Mega 2560",
            "ATmega2560",
            9600,
            Some("arduino:avr:mega"),
        ),
        p(
            "esp32",
            "ESP32 Dev Module",
            "ESP32",
            115200,
            Some("esp32:esp32:esp32"),
        ),
        p(
            "esp8266",
            "ESP8266 (NodeMCU)",
            "ESP8266",
            115200,
            Some("esp8266:esp8266:nodemcuv2"),
        ),
        p("pico", "Raspberry Pi Pico", "RP2040", 115200, None),
        p("stm32", "STM32 (generic)", "STM32F1", 115200, None),
    ]
}

/// Look up a profile by id.
pub fn get(id: &str) -> Option<BoardProfile> {
    catalog().into_iter().find(|b| b.id == id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalog_has_expected_boards() {
        let ids: Vec<String> = catalog().into_iter().map(|b| b.id).collect();
        for expected in ["uno", "nano", "mega", "esp32", "esp8266", "pico", "stm32"] {
            assert!(ids.contains(&expected.to_string()), "missing {expected}");
        }
    }

    #[test]
    fn get_known_and_unknown() {
        assert_eq!(get("esp32").unwrap().default_baud, 115200);
        assert!(get("does-not-exist").is_none());
    }
}
