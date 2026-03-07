import { spawn, spawnSync } from "node:child_process";

const CONTAINER_NAME = process.env.PG_CONTAINER_NAME || "usb-api-postgres";
const POSTGRES_USER = process.env.PGUSER || "usbuser";
const POSTGRES_PASSWORD = process.env.PGPASSWORD || "usbpass";
const POSTGRES_DB = process.env.PGDATABASE || "usb_api_client";
const HOST_PORT = process.env.PGPORT || "5433";
const DEFAULT_DATABASE_URL = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${HOST_PORT}/${POSTGRES_DB}`;
const DEFAULT_SESSION_SECRET = "usb-api-client-local-dev-secret";

function run(command, args, options = {}) {
  return spawnSync(command, args, { stdio: "pipe", encoding: "utf8", ...options });
}

function runInherit(command, args) {
  return spawnSync(command, args, { stdio: "inherit" });
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function ensureDocker() {
  const check = run("docker", ["info"]);
  if (check.status !== 0) {
    console.error("Docker is not running. Start Docker Desktop and try again.");
    process.exit(1);
  }
}

function ensurePostgresContainer() {
  const existing = run("docker", [
    "ps",
    "-a",
    "--filter",
    `name=^/${CONTAINER_NAME}$`,
    "--format",
    "{{.Names}}",
  ]);

  if (existing.status !== 0) {
    console.error(existing.stderr || "Unable to query Docker containers.");
    process.exit(1);
  }

  const name = (existing.stdout || "").trim();

  if (name === CONTAINER_NAME) {
    const start = runInherit("docker", ["start", CONTAINER_NAME]);
    if (start.status !== 0) {
      process.exit(start.status || 1);
    }
    return;
  }

  const create = runInherit("docker", [
    "run",
    "--name",
    CONTAINER_NAME,
    "-e",
    `POSTGRES_USER=${POSTGRES_USER}`,
    "-e",
    `POSTGRES_PASSWORD=${POSTGRES_PASSWORD}`,
    "-e",
    `POSTGRES_DB=${POSTGRES_DB}`,
    "-p",
    `${HOST_PORT}:5432`,
    "-d",
    "postgres:16",
  ]);

  if (create.status !== 0) {
    process.exit(create.status || 1);
  }
}

function waitForPostgres() {
  const maxTries = 40;
  for (let attempt = 0; attempt < maxTries; attempt += 1) {
    const ready = run("docker", [
      "exec",
      CONTAINER_NAME,
      "pg_isready",
      "-U",
      POSTGRES_USER,
      "-d",
      POSTGRES_DB,
    ]);

    if (ready.status === 0) {
      return;
    }

    sleep(1000);
  }

  console.error("PostgreSQL did not become ready in time.");
  process.exit(1);
}

function startApp() {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCmd, ["run", "dev"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
      SESSION_SECRET: process.env.SESSION_SECRET || DEFAULT_SESSION_SECRET,
    },
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });

  child.on("error", (error) => {
    console.error(error.message);
    process.exit(1);
  });
}

ensureDocker();
ensurePostgresContainer();
waitForPostgres();
startApp();
