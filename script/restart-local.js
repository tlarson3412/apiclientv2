import { spawnSync } from "node:child_process";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const stop = spawnSync(npmCmd, ["run", "stop:local"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if ((stop.status ?? 0) !== 0) {
  process.exit(stop.status ?? 1);
}

const start = spawnSync(npmCmd, ["run", "dev:local"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(start.status ?? 0);
