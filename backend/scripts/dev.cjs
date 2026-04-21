const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const backendRoot = path.resolve(__dirname, "..");

function hasCommand(commandName) {
  const result = spawnSync(commandName, ["--version"], {
    stdio: "ignore",
    shell: true,
  });

  return result.status === 0;
}

function resolveVenvPython() {
  const candidates = [
    path.join(backendRoot, ".venv", "Scripts", "python.exe"),
    path.join(backendRoot, ".venv", "bin", "python"),
    path.join(backendRoot, "venv", "Scripts", "python.exe"),
    path.join(backendRoot, "venv", "bin", "python"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function buildCandidates() {
  const candidates = [];
  const condaExeFromEnv = typeof process.env.CONDA_EXE === "string"
    ? process.env.CONDA_EXE.trim()
    : "";

  if (condaExeFromEnv.length > 0 || hasCommand("conda")) {
    candidates.push({
      label: "conda",
      command: condaExeFromEnv.length > 0 ? condaExeFromEnv : "conda",
      args: ["run", "--no-capture-output", "-n", "dev", "python"],
      shell: false,
    });
  }

  const venvPython = resolveVenvPython();
  if (venvPython !== null) {
    candidates.push({
      label: "venv",
      command: venvPython,
      args: [],
      shell: false,
    });
  }

  candidates.push({
    label: "python",
    command: process.platform === "win32" ? "python.exe" : "python3",
    args: [],
    shell: false,
  });

  return candidates;
}

function spawnPythonProcess(pythonCandidate, moduleArgs) {
  return spawn(pythonCandidate.command, [...pythonCandidate.args, ...moduleArgs], {
    stdio: "inherit",
    shell: pythonCandidate.shell,
    cwd: backendRoot,
  });
}

function runPipeline(pythonCandidate, callback) {
  const preflight = spawnPythonProcess(pythonCandidate, [
    "-m",
    "app.services.utils.transcription.preflight",
    "--startup-check",
  ]);

  preflight.on("exit", (preflightCode) => {
    if (preflightCode !== 0) {
      callback(new Error(`preflight failed for ${pythonCandidate.label}`));
      return;
    }

    const server = spawnPythonProcess(pythonCandidate, [
      "-m",
      "uvicorn",
      "app.main:app",
      "--reload",
      "--port",
      "8000",
    ]);

    server.on("exit", (serverCode) => {
      process.exit(typeof serverCode === "number" ? serverCode : 1);
    });
  });

  preflight.on("error", (error) => {
    callback(error);
  });
}

function main() {
  const candidates = buildCandidates();

  let candidateIndex = 0;
  const tryNext = () => {
    const candidate = candidates[candidateIndex];
    if (candidate === undefined) {
      process.exit(1);
      return;
    }

    candidateIndex += 1;

    runPipeline(candidate, () => {
      tryNext();
    });
  };

  tryNext();
}

main();