import { test, expect } from "@playwright/test";

test.describe("App shell", () => {
  test("renders the app with activity rail and status bar", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="activity-rail"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-bar"]')).toBeVisible();
  });

  test("navigates between workspaces via activity rail", async ({ page }) => {
    await page.goto("/");
    // Click each workspace button and verify the section renders
    const workspaces = [
      "dashboard", "code", "circuit", "pcb", "cad",
      "bom", "export", "compile", "ai", "settings",
    ];
    for (const ws of workspaces) {
      const btn = page.locator(`[aria-label="${ws} workspace"]`);
      if (await btn.isVisible()) {
        await btn.click();
        await expect(page.locator(`[data-testid="workspace-${ws}"]`)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("command palette opens and closes with Cmd+K", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Meta+k");
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-testid="command-palette"]')).not.toBeVisible();
  });
});
