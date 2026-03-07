import { spawnSync } from "node:child_process";

const CONTAINER_NAME = process.env.PG_CONTAINER_NAME || "usb-api-postgres";

function run(command, args) {
  return spawnSync(command, args, { stdio: "pipe", encoding: "utf8" });
}

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

if (name !== CONTAINER_NAME) {
  console.log(`${CONTAINER_NAME} container does not exist.`);
  process.exit(0);
}

const stop = spawnSync("docker", ["stop", CONTAINER_NAME], { stdio: "inherit" });
process.exit(stop.status ?? 0);
