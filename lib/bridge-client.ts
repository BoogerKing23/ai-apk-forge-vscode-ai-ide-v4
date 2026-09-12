import { isAllowedOperation, isLocalBridgeUrl, redactSecrets } from "./forge-policy";
import type { BridgeOperation, BridgeResult, BridgeSettings } from "./forge-types";

export type ExecuteInput = {
  operation: BridgeOperation;
  projectPath?: string;
  repository?: string;
  runId?: string;
  patch?: string;
  idempotencyKey?: string;
  filePath?: string;
  content?: string;
  query?: string;
  confirmed?: boolean;
  task?: string;
};

type WireResult = {
  ok?: boolean;
  output?: string;
  artifactPath?: string;
  runId?: string;
  repository?: string;
  error?: string;
  completed?: boolean;
  success?: boolean;
  conclusion?: string;
  artifactValid?: boolean;
  branch?: string;
  commitSha?: string;
  workflowStatus?: string;
  workflowUrl?: string;
  protocol?: string;
  files?: string[];
  content?: string;
  matches?: string[];
  task?: string;
  filesStatus?: string[];
  diff?: string;
};

function endpoint(baseUrl: string, suffix: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${suffix}`;
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) throw new Error(body.error || `Most zwrócił status ${response.status}.`);
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function validateSettings(settings: BridgeSettings) {
  if (!isLocalBridgeUrl(settings.baseUrl)) {
    throw new Error("Dopuszczalny jest wyłącznie lokalny adres Mostu: http://127.0.0.1:46321.");
  }
  if (settings.pairingKey.trim().length < 24) {
    throw new Error("Klucz parowania Mostu powinien mieć co najmniej 24 znaki.");
  }
}

export async function checkBridge(settings: BridgeSettings): Promise<BridgeResult> {
  validateSettings(settings);
  const result = await request<WireResult>(endpoint(settings.baseUrl, "/v1/health"), {
    headers: { "X-Apk-Forge-Key": settings.pairingKey.trim() },
  });
  return { ok: Boolean(result.ok), output: redactSecrets(result.output || "Most odpowiada.") };
}

export async function executeBridgeOperation(
  settings: BridgeSettings,
  input: ExecuteInput,
): Promise<BridgeResult> {
  validateSettings(settings);
  if (!isAllowedOperation(input.operation) || input.operation === "health") {
    throw new Error("Ta operacja nie jest dopuszczona przez politykę aplikacji.");
  }
  const result = await request<WireResult>(endpoint(settings.baseUrl, "/v1/execute"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Apk-Forge-Key": settings.pairingKey.trim(),
    },
    body: JSON.stringify(input),
  });
  return {
    ok: Boolean(result.ok),
    output: redactSecrets(result.output || result.error || "Operacja zakończona."),
    artifactPath: result.artifactPath,
    runId: result.runId,
    repository: result.repository,
    completed: result.completed,
    success: result.success,
    conclusion: result.conclusion,
    artifactValid: result.artifactValid,
    branch: result.branch,
    commitSha: result.commitSha,
    workflowStatus: result.workflowStatus,
    workflowUrl: result.workflowUrl,
    protocol: result.protocol,
    files: result.files,
    content: result.content,
    matches: result.matches,
    task: result.task,
    filesStatus: result.filesStatus,
    diff: result.diff,
  };
}
