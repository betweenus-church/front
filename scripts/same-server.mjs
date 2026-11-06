import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stateFile = path.join(root, ".server", "process.json");
const settings = parseEnv(readFileSync(path.join(root, ".env.server"), "utf8"));
const origin = new URL(settings.PUBLIC_ORIGIN).origin;
const clientPort = Number(settings.CLIENT_PORT || 3101);
const adminPort = Number(settings.ADMIN_PORT || 3102);
for (const port of [clientPort, adminPort]) assert.ok(Number.isInteger(port) && port > 1023 && port < 65536);
assert.notEqual(clientPort, adminPort);
const environment = {
  ...process.env,
  SAI_ENV: "production",
  SAI_SINGLE_SERVER: "1",
  API_INTERNAL_URL: settings.API_INTERNAL_URL || "http://127.0.0.1:4000",
  ADMIN_INTERNAL_URL: `http://127.0.0.1:${adminPort}`,
  NEXT_PUBLIC_CLIENT_URL: origin,
  NEXT_TELEMETRY_DISABLED: "1",
};
const apps = [ ["admin", adminPort], ["client", clientPort] ];
function launch(app, args) {
  const cwd = path.join(root, app);
  const cli = createRequire(path.join(cwd, "package.json")).resolve("next/dist/bin/next");
  return spawn(process.execPath, [cli, ...args], { cwd, env: environment, stdio: "inherit", windowsHide: true });
}
async function available(port) {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
const action = process.argv[2];
if (action === "build") {
  for (const [app] of apps) {
    const child = launch(app, ["build", "--webpack"]);
    await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", code => code === 0 ? resolve() : reject(new Error(`${app} build failed: ${code}`))); });
  }
} else if (action === "start") {
  for (const [app, port] of apps) {
    assert.ok(existsSync(path.join(root, app, ".next-production", "BUILD_ID")), `Run pnpm build:server first (${app}).`);
    await available(port);
  }
  const children = apps.map(([app, port]) => launch(app, ["start", "-H", "127.0.0.1", "-p", String(port)]));
  mkdirSync(path.dirname(stateFile), { recursive: true });
  writeFileSync(stateFile, JSON.stringify({ pid: process.pid, origin, clientPort, adminPort, children: children.map(child => child.pid) }, null, 2));
  let stopping = false;
  function stop(code) {
    if (stopping) return;
    stopping = true;
    for (const child of children) child.kill();
    if (existsSync(stateFile) && JSON.parse(readFileSync(stateFile, "utf8")).pid === process.pid) unlinkSync(stateFile);
    process.exitCode = code;
  }
  process.once("SIGINT", () => stop(0));
  process.once("SIGTERM", () => stop(0));
  for (const child of children) {
    child.once("error", error => { console.error(error); stop(1); });
    child.once("exit", code => { if (!stopping) stop(code || 1); });
  }
  console.log(`Both apps: ${origin} (client ${clientPort}, admin ${adminPort})`);
} else if (action === "stop") {
  const state = JSON.parse(readFileSync(stateFile, "utf8"));
  assert.ok(Number.isInteger(state.pid) && state.pid > 0);
  if (process.platform === "win32") {
    const script = `$p=Get-CimInstance Win32_Process -Filter 'ProcessId=${state.pid}'; if (-not $p -or $p.Name -ne 'node.exe' -or $p.CommandLine -notmatch 'same-server.mjs.+start') { throw 'Server process does not match; nothing stopped' }; & taskkill.exe /PID ${state.pid} /T /F; exit $LASTEXITCODE`;
    execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")], { stdio: "inherit", windowsHide: true });
  } else process.kill(state.pid, "SIGTERM");
  if (existsSync(stateFile)) unlinkSync(stateFile);
} else throw new Error("Usage: node scripts/same-server.mjs <build|start|stop>");
