const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const backendRoot = path.resolve(__dirname, "..");
const preferredCondaEnvironments = new Set(["dev", "chatbot", "aura"]);

function isGracefulTerminationSignal(signal) {
  return signal === "SIGINT" || signal === "SIGTERM";
}

function shouldUseShellForConda(condaCommand) {
  if (typeof condaCommand !== "string") {
    return false;
  }

  if (process.platform !== "win32") {
    return false;
  }

  return !condaCommand.toLowerCase().endsWith(".exe");
}

function hasCommand(commandName) {
  const result = spawnSync(commandName, ["--version"], {
    stdio: "ignore",
    shell: true,
  });

  return result.status === 0;
}

function normalizeEnvironmentName(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

function listCondaEnvironments(condaCommand) {
  const useShell = shouldUseShellForConda(condaCommand);
  const result = spawnSync(condaCommand, ["env", "list", "--json"], {
    cwd: backendRoot,
    shell: useShell,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    const stderr = typeof result.stderr === "string" ? result.stderr.trim() : "";
    return {
      environments: [],
      error: stderr.length > 0 ? stderr : "conda env list failed",
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    return {
      environments: [],
      error: "conda env list returned invalid JSON",
    };
  }

  if (!Array.isArray(parsed.envs)) {
    return {
      environments: [],
      error: "conda env list JSON does not contain envs array",
    };
  }

  const environments = [];
  const seen = new Set();

  for (const envPathRaw of parsed.envs) {
    if (typeof envPathRaw !== "string" || envPathRaw.trim().length === 0) {
      continue;
    }

    const envPath = envPathRaw.replace(/[\\/]+$/, "");
    const envName = path.basename(envPath);
    const normalizedName = normalizeEnvironmentName(envName);

    if (normalizedName.length === 0 || seen.has(normalizedName)) {
      continue;
    }

    environments.push({
      name: envName,
      path: envPath,
      normalizedName,
    });
    seen.add(normalizedName);
  }

  return {
    environments,
    error: null,
  };
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

function appendCondaCandidates(candidates, condaCommand) {
  const useShell = shouldUseShellForConda(condaCommand);
  const { environments, error } = listCondaEnvironments(condaCommand);

  if (error !== null) {
    console.warn(`[dev] Failed to list conda environments: ${error}`);
    return;
  }

  if (environments.length === 0) {
    console.log("[dev] No conda environments found.");
    return;
  }

  const allNames = environments.map((environment) => environment.name);
  console.log(`[dev] Found conda environments: ${allNames.join(", ")}`);

  const matchingCondaEnvironments = environments.filter((environment) =>
    preferredCondaEnvironments.has(environment.normalizedName),
  );

  if (matchingCondaEnvironments.length === 0) {
    console.log("[dev] No matching conda environment found (dev/chatbot/aura).");
    return;
  }

  const matchingNames = matchingCondaEnvironments.map((environment) => environment.name);
  console.log(`[dev] Preferred conda environments: ${matchingNames.join(", ")}`);

  for (const environment of matchingCondaEnvironments) {
    candidates.push({
      label: `conda:${environment.name}`,
      command: condaCommand,
      args: ["run", "--no-capture-output", "-n", environment.name, "python"],
      shell: useShell,
    });
  }
}

function buildCandidates() {
  const candidates = [];
  const condaExeFromEnv = typeof process.env.CONDA_EXE === "string"
    ? process.env.CONDA_EXE.trim()
    : "";
  const condaCommand = condaExeFromEnv.length > 0 ? condaExeFromEnv : "conda";

  if (condaExeFromEnv.length > 0 || hasCommand("conda")) {
    appendCondaCandidates(candidates, condaCommand);
  } else {
    console.log("[dev] Conda not available in PATH and CONDA_EXE not set.");
  }

  const venvPython = resolveVenvPython();
  if (venvPython === null) {
    console.log("[dev] No local venv/.venv found in backend directory.");
  } else {
    console.log(`[dev] Found local virtual environment: ${venvPython}`);
    candidates.push({
      label: "venv",
      command: venvPython,
      args: [],
      shell: false,
    });
  }

  console.log("[dev] Adding system Python fallback.");
  candidates.push({
    label: "python",
    command: process.platform === "win32" ? "python.exe" : "python3",
    args: [],
    shell: false,
  });

  return candidates;
}

function commandToString(command, args) {
  return [command, ...args].join(" ");
}

function spawnPythonProcess(pythonCandidate, moduleArgs) {
  return spawn(pythonCandidate.command, [...pythonCandidate.args, ...moduleArgs], {
    stdio: "inherit",
    shell: pythonCandidate.shell,
    cwd: backendRoot,
  });
}

function runPipeline(pythonCandidate, callback) {
  const preflightArgs = [
    "-m",
    "app.services.utils.transcription.preflight",
    "--startup-check",
  ];

  console.log(`[dev] Trying environment: ${pythonCandidate.label}`);
  console.log(`[dev] Running preflight: ${commandToString(pythonCandidate.command, [...pythonCandidate.args, ...preflightArgs])}`);

  const preflight = spawnPythonProcess(pythonCandidate, preflightArgs);

  preflight.on("exit", (preflightCode, preflightSignal) => {
    if (isGracefulTerminationSignal(preflightSignal)) {
      process.exit(0);
      return;
    }

    if (preflightCode !== 0) {
      callback(new Error(`preflight failed with exit code ${preflightCode}`));
      return;
    }

    const serverArgs = [
      "-m",
      "uvicorn",
      "app.main:app",
      "--reload",
      "--port",
      "8000",
    ];

    console.log(`[dev] Using environment: ${pythonCandidate.label}`);
    console.log(`[dev] Starting server: ${commandToString(pythonCandidate.command, [...pythonCandidate.args, ...serverArgs])}`);

    const server = spawnPythonProcess(pythonCandidate, serverArgs);

    server.on("exit", (serverCode, serverSignal) => {
      if (typeof serverCode === "number") {
        process.exit(serverCode);
        return;
      }

      process.exit(isGracefulTerminationSignal(serverSignal) ? 0 : 1);
    });

    server.on("error", (error) => {
      callback(error);
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
      console.error("[dev] No working Python environment found for backend startup.");
      process.exit(1);
      return;
    }

    candidateIndex += 1;

    runPipeline(candidate, (error) => {
      if (error instanceof Error) {
        console.warn(`[dev] Environment ${candidate.label} failed: ${error.message}`);
      } else {
        console.warn(`[dev] Environment ${candidate.label} failed.`);
      }

      tryNext();
    });
  };

  tryNext();
}

main();