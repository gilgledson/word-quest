import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Celular pequeno em retrato: o jogo é pensado para 360×800.
    ...devices["Pixel 5"],
    viewport: { width: 360, height: 800 },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium-360x800" }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
