import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  // Starts the production build with a fresh database and test secrets.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `node -e "require('fs').rmSync('apps/web/.data',{recursive:true,force:true})" && pnpm --filter web exec next start -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        env: {
          CONSOLE_PASSWORD: "e2e-password",
          ORDER_SIGNING_SECRET: "e2e-signing-secret-0123456789",
        },
      },
});
