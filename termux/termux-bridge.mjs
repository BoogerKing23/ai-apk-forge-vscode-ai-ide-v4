import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdtempSync, promises as fs } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";

const exec = promisify(execFile);
const host = "127.0.0.1";
const port = 46321;
const pairingKey = process.env.AI_APK_FORGE_BRIDGE_KEY || "";
const rootDirectory = resolve(homedir());
const downloads = join(rootDirectory, "storage", "downloads", "AI-APK-Forge");
const maxBodyBytes = 48 * 1024;
const stateDirectory = join(rootDirectory, ".ai-apk-forge");
const operationStateFile = join(stateDirectory, "operations.json");
const operationState = new Map();

async function loadOperationState() {
  try {
    const stored = JSON.parse(await fs.readFile(operationStateFile, "utf8"));
    for (const [key, value] of Object.entries(stored)) operationState.set(key, value);
  } catch {
    // Pierwsze uruchomienie lub niepełny plik stanu.
  }
}

async function saveOperationState() {
  await fs.mkdir(stateDirectory, { recursive: true });
  await fs.writeFile(operationStateFile, JSON.stringify(Object.fromEntries(operationState)), "utf8");
}

if (pairingKey.length < 24) {
  console.error("Ustaw zmienną AI_APK_FORGE_BRIDGE_KEY na losowy klucz o długości co najmniej 24 znaków.");
  process.exit(1);
}

function safeOutput(value) {
  return String(value || "")
    .replace(/(?:ghp|github_pat|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}/gi, "[UKRYTY_TOKEN]")
    .replace(/(?:Bearer\s+|authorization\s*[:=]\s*Bearer\s+)[A-Za-z0-9._~+/=-]{20,}/gi, "[UKRYTY_TOKEN]")
    .replace(/(?:api[_-]?key|token|password|secret)\s*[:=]\s*[^\s,;]+/gi, "$1=[UKRYTE]")
    .replace(/-----BEGIN [^-]+-----[\s\S]+?-----END [^-]+-----/g, "[UKRYTY_KLUCZ]")
    .slice(-12000);
}

function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Apk-Forge-Key",
  });
  response.end(JSON.stringify(body));
}

function isAuthenticated(request) {
  return request.headers["x-apk-forge-key"] === pairingKey;
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBodyBytes) throw new Error("Żądanie jest zbyt duże.");
  }
  return JSON.parse(body || "{}");
}

async function projectDirectory(value) {
  if (typeof value !== "string" || value.length > 500 || value.includes("\0")) throw new Error("Niepoprawna ścieżka projektu.");
  const candidate = resolve(value);
  const relation = relative(rootDirectory, candidate);
  if (relation.startsWith("..") || resolve(rootDirectory, relation) !== candidate) throw new Error("Projekt musi znajdować się w katalogu domowym Termuxa.");
  const real = await fs.realpath(candidate).catch(() => "");
  if (!real || !existsSync(join(real, ".git"))) throw new Error("Wskazany katalog nie jest repozytorium Git.");
  const realRelation = relative(rootDirectory, real);
  if (realRelation.startsWith("..")) throw new Error("Dowiązanie projektu wychodzi poza katalog domowy.");
  return real;
}

async function run(command, args, cwd, timeout = 120000) {
  try {
    const { stdout, stderr } = await exec(command, args, { cwd, timeout, maxBuffer: 1024 * 1024 });
    return { ok: true, output: safeOutput(`${stdout}\n${stderr}`.trim()) || "Operacja zakończona." };
  } catch (error) {
    return { ok: false, output: safeOutput(`${error.stdout || ""}\n${error.stderr || error.message || "Nieznany błąd."}`.trim()) };
  }
}

function validRepository(value) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(value);
}

async function repositoryName(cwd) {
  const result = await run("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"], cwd);
  if (!result.ok) throw new Error(result.output);
  return result.output.trim();
}

function patchFiles(patch) {
  if (typeof patch !== "string" || patch.length < 20 || patch.length > 24000) throw new Error("Poprawka ma nieprawidłowy rozmiar.");
  const matches = [...patch.matchAll(/^diff --git a\/(.+) b\/(.+)$/gm)];
  if (!matches.length) throw new Error("Poprawka musi być ujednoliconym diffem Git.");
  const prohibited = /(^|\/)(\.env|\.npmrc|id_rsa|.*\.pem|.*\.keystore|.*\.jks)$/i;
  for (const match of matches) {
    for (const name of [match[1], match[2]]) {
      if (name.includes("..") || name.startsWith("/") || prohibited.test(name)) {
        throw new Error("Poprawka dotyka niedozwolonego pliku.");
      }
    }
  }
  return matches.map((match) => match[2]);
}


const textFilePattern = /\.(?:tsx?|jsx?|mjs|cjs|json|jsonc|md|mdx|yml|yaml|xml|gradle|kts|properties|toml|css|scss|html|java|kt|swift|py|sh|txt)$/i;
const protectedPathPattern = /(^|\/)(?:\.env(?:\..*)?|\.npmrc|\.git(?:\/|$)|id_rsa|.*\.(?:pem|key|p12|pfx|jks|keystore))$/i;

async function projectFile(cwd, value, requireExisting = true) {
  if (typeof value !== "string" || value.length < 1 || value.length > 300 || value.includes("\0")) {
    throw new Error("Niepoprawna ścieżka pliku.");
  }
  const relativePath = value.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!relativePath || relativePath.includes("..") || relativePath.startsWith(".git/") || protectedPathPattern.test(relativePath)) {
    throw new Error("Plik jest poza dozwolonym zakresem edytora.");
  }
  if (!textFilePattern.test(relativePath)) {
    throw new Error("Edytor obsługuje wyłącznie pliki tekstowe.");
  }
  const filePath = resolve(cwd, relativePath);
  const relation = relative(cwd, filePath);
  if (relation.startsWith("..") || relation.includes(`..${sep}`) || filePath === cwd) {
    throw new Error("Plik musi należeć do katalogu projektu.");
  }
  if (requireExisting && !(await fs.stat(filePath).catch(() => null))) {
    throw new Error("Plik nie istnieje.");
  }
  return filePath;
}

async function listProjectFiles(cwd) {
  const result = await run(
    "find",
    [".", "-type", "f", "-not", "-path", "./.git/*", "-not", "-path", "./node_modules/*", "-not", "-path", "./.expo/*", "-not", "-path", "*/build/*", "-not", "-path", "*/dist/*"],
    cwd,
  );
  if (!result.ok) return result;
  const files = result.output
    .split("\n")
    .map((line) => line.trim().replace(/^\.\//, ""))
    .filter((name) => name && textFilePattern.test(name) && !protectedPathPattern.test(name))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 1200);
  return {
    ok: true,
    output: `Znaleziono ${files.length} plików tekstowych.`,
    files,
  };
}

async function readProjectFile(cwd, relativePath) {
  const filePath = await projectFile(cwd, relativePath, true);
  const info = await fs.stat(filePath);
  if (info.size > 240 * 1024) throw new Error("Plik jest zbyt duży dla wbudowanego edytora.");
  const content = await fs.readFile(filePath, "utf8");
  return { ok: true, output: `Odczytano ${relativePath} (${content.length} znaków).`, content: content.slice(0, 20000) };
}

async function writeProjectFile(cwd, relativePath, content) {
  const filePath = await projectFile(cwd, relativePath, false);
  if (typeof content !== "string" || content.length > 240 * 1024) throw new Error("Treść pliku jest zbyt duża.");
  if (protectedPathPattern.test(relativePath)) throw new Error("Nie można zapisywać plików zawierających sekrety.");
  const parent = resolve(filePath, "..");
  await fs.mkdir(parent, { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  return { ok: true, output: `Zapisano ${relativePath}.`, content };
}


const allowedTasks = new Map([
  ["check", ["pnpm", ["check"]]],
  ["lint", ["pnpm", ["lint"]]],
  ["test", ["pnpm", ["test"]]],
  ["build", ["pnpm", ["build"]]],
  ["format", ["pnpm", ["format"]]],
  ["android:assembleDebug", ["./gradlew", ["assembleDebug"]]],
  ["android:assembleRelease", ["./gradlew", ["assembleRelease"]]],
]);

async function runProjectTask(cwd, task) {
  if (typeof task !== "string" || !allowedTasks.has(task)) {
    throw new Error(`Nieznane lub niedozwolone zadanie. Dozwolone: ${[...allowedTasks.keys()].join(", ")}.`);
  }
  const [command, args] = allowedTasks.get(task);
  const timeout = task.startsWith("android:") || task === "build" || task === "test" ? 10 * 60 * 1000 : 3 * 60 * 1000;
  const result = await run(command, args, cwd, timeout);
  return {
    ...result,
    task,
    output: `Zadanie: ${task}\n${result.output}`,
  };
}

async function searchProjectFiles(cwd, query) {
  if (typeof query !== "string" || query.trim().length < 2 || query.length > 200) throw new Error("Wyszukiwana fraza ma nieprawidłowy rozmiar.");
  const result = await run(
    "grep",
    ["-RIn", "-I", "--exclude-dir=.git", "--exclude-dir=node_modules", "--exclude-dir=.expo", "--exclude-dir=build", "--exclude-dir=dist", "--exclude=.env", "--exclude=.npmrc", "--", query, "."],
    cwd,
  );
  if (!result.ok && !result.output) return { ok: false, output: "Wyszukiwanie nie znalazło wyników." };
  const matches = result.output.split("\n").filter(Boolean).slice(0, 200);
  return { ok: true, output: `Znaleziono ${matches.length} wyników.`, matches };
}

async function hasSensitiveChanges(cwd) {
  const result = await run("git", ["diff", "--cached", "--name-only"], cwd);
  if (!result.ok) throw new Error(result.output);
  const protectedFile = /(^|\/)(\.env(?:\..*)?|\.npmrc|.*\.(?:pem|key|p12|pfx|jks|keystore))$/i;
  const sensitive = result.output
    .split("\n")
    .map((line) => line.trim())
    .filter((name) => protectedFile.test(name));
  if (sensitive.length) {
    throw new Error(`Publikacja zatrzymana: wykryto pliki zawierające potencjalne sekrety: ${sensitive.join(", ")}. Usuń je z indeksu Git i spróbuj ponownie.`);
  }
}

async function hasTrackedSensitiveFiles(cwd) {
  const result = await run("git", ["ls-files"], cwd);
  if (!result.ok) throw new Error(result.output);
  const protectedFile = /(^|\/)(\.env(?:\..*)?|\.npmrc|.*\.(?:pem|key|p12|pfx|jks|keystore))$/i;
  const sensitive = result.output
    .split("\n")
    .map((line) => line.trim())
    .filter((name) => protectedFile.test(name));
  if (sensitive.length) {
    throw new Error(`Publikacja zatrzymana: repozytorium już śledzi potencjalnie tajne pliki: ${sensitive.join(", ")}. Usuń je z indeksu Git i spróbuj ponownie.`);
  }
}

async function applyPatch(cwd, patch) {
  const files = patchFiles(patch);
  const folder = mkdtempSync(join(tmpdir(), "ai-apk-forge-"));
  const patchFile = join(folder, "repair.patch");
  try {
    await fs.writeFile(patchFile, patch, "utf8");
    const checked = await run("git", ["apply", "--check", patchFile], cwd);
    if (!checked.ok) return checked;
    const applied = await run("git", ["apply", "--whitespace=fix", patchFile], cwd);
    return { ...applied, output: `${applied.output}\nZmienione pliki: ${files.join(", ")}` };
  } finally {
    await fs.rm(folder, { recursive: true, force: true });
  }
}

async function validateApkFile(filePath) {
  const info = await fs.stat(filePath).catch(() => null);
  if (!info || info.size < 100 * 1024 || info.size > 500 * 1024 * 1024) return false;
  const handle = await fs.open(filePath, "r").catch(() => null);
  if (!handle) return false;
  try {
    const header = Buffer.alloc(4);
    await handle.read(header, 0, 4, 0);
    return header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04;
  } finally {
    await handle.close();
  }
}

async function handleOperation(payload) {
  const idempotencyKey = typeof payload.idempotencyKey === "string" ? payload.idempotencyKey.slice(0, 200) : "";
  if (idempotencyKey && operationState.has(idempotencyKey)) return operationState.get(idempotencyKey);
  const cwd = await projectDirectory(payload.projectPath);
  const operation = payload.operation;
  if (operation === "list_files") return listProjectFiles(cwd);
  if (operation === "read_file") return readProjectFile(cwd, payload.filePath);
  if (operation === "write_file") {
    if (payload.confirmed !== true) throw new Error("Zapis wymaga jawnego potwierdzenia w edytorze.");
    return writeProjectFile(cwd, payload.filePath, payload.content);
  }
  if (operation === "search_files") return searchProjectFiles(cwd, payload.query);
  if (operation === "git_status") {
    const result = await run("git", ["status", "--short"], cwd);
    return { ...result, filesStatus: result.output.split("\n").filter(Boolean).slice(0, 300), output: result.output || "Czysty workspace." };
  }
  if (operation === "git_diff") {
    const result = await run("git", ["diff", "--no-ext-diff", "--unified=3"], cwd);
    return { ...result, diff: result.output, output: result.output || "Brak niezacommitowanego diffu." };
  }
  if (operation === "run_task") return runProjectTask(cwd, payload.task);
  if (operation === "inspect") {
    const [status, branch, commit, diffStat, diff, remote, nodeVersion, javaVersion, ghAuth] = await Promise.all([
      run("git", ["status", "--short"], cwd),
      run("git", ["branch", "--show-current"], cwd),
      run("git", ["rev-parse", "HEAD"], cwd),
      run("git", ["diff", "--stat"], cwd),
      run("git", ["diff", "--no-ext-diff", "--unified=2"], cwd),
      run("git", ["remote", "get-url", "origin"], cwd),
      run("node", ["--version"], cwd),
      run("java", ["-version"], cwd),
      run("gh", ["auth", "status"], cwd),
    ]);
    const workflowFile = await fs.access(join(cwd, ".github", "workflows", "android-apk.yml")).then(() => true).catch(() => false);
    const output = [
      `Gałąź: ${branch.output || "nieznana"}`,
      `Commit: ${commit.output || "brak"}`,
      `Node: ${nodeVersion.output || "niedostępny"}`,
      `Java: ${javaVersion.output || "niedostępna"}`,
      `Statystyka diff: ${diffStat.output || "brak zmian"}`,
      `GitHub CLI: ${ghAuth.ok ? "uwierzytelnione" : "brak autoryzacji"}`,
      `Origin: ${remote.output || "brak"}`,
      `Workflow android-apk.yml: ${workflowFile ? "znaleziony" : "brak"}`,
      `Zmiany:\n${status.output || "brak"}`,
      `Diff:\n${diff.output || "brak"}`,
    ].join("\n");
    return { ok: status.ok && branch.ok && commit.ok, output, branch: branch.output || undefined, commitSha: commit.output || undefined };
  }
  if (operation === "publish") {
    if (!validRepository(payload.repository)) throw new Error("Niepoprawna nazwa repozytorium.");
    await hasTrackedSensitiveFiles(cwd);
    const remote = await run("git", ["remote", "get-url", "origin"], cwd);
    if (!remote.ok) {
      const created = await run("gh", ["repo", "create", payload.repository, "--private", "--source=.", "--remote=origin", "--push"], cwd);
      return { ...created, repository: created.ok ? await repositoryName(cwd).catch(() => payload.repository) : undefined };
    }
    const stage = await run("git", ["add", "-A"], cwd);
    if (!stage.ok) return stage;
    await hasSensitiveChanges(cwd);
    const changed = await run("git", ["status", "--porcelain"], cwd);
    if (changed.output.trim()) {
      const commit = await run("git", ["commit", "-m", "chore: prepare Android APK build"], cwd);
      if (!commit.ok) return commit;
    }
    const branch = await run("git", ["branch", "--show-current"], cwd);
    const pushed = await run("git", ["push", "-u", "origin", branch.output.trim() || "main"], cwd);
    return { ...pushed, repository: pushed.ok ? await repositoryName(cwd).catch(() => payload.repository) : undefined };
  }
  if (operation === "start_build") {
    const repository = await repositoryName(cwd);
    const dispatchStartedAt = Date.now();
    const started = await run("gh", ["workflow", "run", "android-apk.yml", "--repo", repository], cwd);
    if (!started.ok) return started;
    let latest = { ok: false, output: "" };
    for (let poll = 0; poll < 10; poll += 1) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
      latest = await run("gh", ["run", "list", "--workflow", "android-apk.yml", "--limit", "1", "--json", "databaseId,status,conclusion,url,createdAt", "--jq", ".[0]"], cwd);
      if (latest.ok && latest.output.trim()) {
        try {
          const candidate = JSON.parse(latest.output);
          if (candidate.databaseId && Date.parse(candidate.createdAt || "") >= dispatchStartedAt - 5000) break;
        } catch {
          // Zaczekaj na poprawną odpowiedź JSON z GitHuba.
        }
      }
    }
    const record = latest.ok ? JSON.parse(latest.output || "{}") : {};
    const result = { ok: Boolean(record.databaseId), output: `Workflow uruchomiony. ${latest.output || "Nie odnaleziono nowego przebiegu."}`, runId: record.databaseId ? String(record.databaseId) : undefined, workflowUrl: record.url, workflowStatus: record.status, repository };
    if (idempotencyKey && result.ok) {
      operationState.set(idempotencyKey, result);
      await saveOperationState();
    }
    return result;
  }
  if (operation === "build_status") {
    const repository = await repositoryName(cwd);
    const latest = await run("gh", ["run", "view", String(payload.runId || ""), "--repo", repository, "--json", "databaseId,status,conclusion,url,name,jobs", "--jq", "."], cwd);
    if (!latest.ok) return latest;
    const record = JSON.parse(latest.output || "{}");
    const complete = record.status === "completed";
    const success = complete && record.conclusion === "success";
    const jobs = Array.isArray(record.jobs) ? record.jobs.map((job) => `${job.name}: ${job.conclusion || job.status}`).join("; ") : "brak szczegółów zadań";
    let failedLogs = "";
    if (complete && !success) {
      const failed = await run("gh", ["run", "view", String(payload.runId || ""), "--repo", repository, "--log-failed"], cwd);
      failedLogs = failed.output ? `\n\nLOGI NIEUDANEGO BUILDa:\n${failed.output.slice(-9000)}` : "";
    }
    return {
      ok: true,
      success: complete ? success : undefined,
      completed: complete,
      conclusion: record.conclusion,
      output: `Status: ${record.status || "nieznany"}; wynik: ${record.conclusion || "oczekiwanie"}; zadania: ${jobs}; ${record.url || ""}${failedLogs}`,
      runId: String(record.databaseId || payload.runId || ""),
      workflowUrl: record.url,
      workflowStatus: record.status,
      repository,
    };
  }
  if (operation === "cancel_build") {
    if (!payload.runId) throw new Error("Brak identyfikatora przebiegu budowania.");
    const repository = await repositoryName(cwd);
    const cancelled = await run("gh", ["run", "cancel", String(payload.runId), "--repo", repository], cwd);
    return { ...cancelled, runId: String(payload.runId), repository };
  }
  if (operation === "download_apk") {
    if (!payload.runId) throw new Error("Brak identyfikatora przebiegu budowania.");
    const repository = await repositoryName(cwd);
    await fs.mkdir(downloads, { recursive: true });
    const downloaded = await run("gh", ["run", "download", String(payload.runId), "--repo", repository, "--name", "apk-release", "--dir", downloads], cwd);
    if (!downloaded.ok) return downloaded;
    const files = await fs.readdir(downloads, { recursive: true });
    const apk = files.find((file) => typeof file === "string" && file.endsWith(".apk"));
    if (!apk) return { ok: false, output: "Artefakt pobrano, ale nie znaleziono pliku APK." };
    const artifactPath = join(downloads, apk);
    const artifactValid = await validateApkFile(artifactPath);
    if (!artifactValid) return { ok: false, artifactValid: false, output: "Pobrany plik nie wygląda na poprawny artefakt APK (zły rozmiar lub nagłówek ZIP)." };
    return { ok: true, artifactValid: true, output: "APK zapisano i zweryfikowano w katalogu Pobrane urządzenia.", artifactPath, repository };
  }
  if (operation === "apply_patch") return applyPatch(cwd, payload.patch);
  throw new Error("Operacja nie jest obsługiwana.");
}

loadOperationState().then(() => {
  createServer(async (request, response) => {
    if (request.method === "OPTIONS") return json(response, 204, {});
    if (!isAuthenticated(request)) return json(response, 401, { ok: false, error: "Brak autoryzacji." });
    if (request.method === "GET" && request.url === "/v1/health") return json(response, 200, { ok: true, output: "Most Termuxa jest gotowy.", protocol: "1.1", capabilities: ["observe", "project-files", "project-search", "git-status", "git-diff", "editor-read-write", "project-tasks", "cancel", "validate-apk", "idempotency"] });
    if (request.method !== "POST" || request.url !== "/v1/execute") return json(response, 404, { ok: false, error: "Nieznana trasa." });
    try {
      const payload = await readBody(request);
      const result = await handleOperation(payload);
      return json(response, result.ok ? 200 : 422, result);
    } catch (error) {
      return json(response, 400, { ok: false, error: safeOutput(error instanceof Error ? error.message : "Nieznany błąd.") });
    }
  }).listen(port, host, () => console.log(`AI APK Forge bridge: ${host}:${port}`));
});
