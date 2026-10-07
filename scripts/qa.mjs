import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const command = process.argv[2];
if (command !== "build" && command !== "start") {
  console.error("Usage: node scripts/qa.mjs <build|start>");
  process.exit(1);
}

const nextCli = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const args = [nextCli, command];
if (command === "start") args.push("-H", "127.0.0.1", "-p", "3002");

const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    SAI_ENV: "qa",
    API_INTERNAL_URL: "http://127.0.0.1:4200",
  },
});

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
