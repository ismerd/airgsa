import { spawnSync } from "node:child_process";

const commands = [
  ["npm", ["run", "check:production"]],
  ["npm", ["run", "check:migrations"]],
  ["npm", ["run", "check:live-services"]],
  ["npm", ["audit", "--audit-level=high"]],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("SaaS readiness preflight passed.");
