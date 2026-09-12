import type { BridgeOperation } from "./forge-types";

export const allowedOperations: BridgeOperation[] = [
  "health",
  "inspect",
  "publish",
  "start_build",
  "build_status",
  "download_apk",
  "apply_patch",
  "list_files",
  "read_file",
  "write_file",
  "search_files",
  "git_status",
  "git_diff",
  "run_task",
];

export function isAllowedOperation(value: string): value is BridgeOperation {
  return allowedOperations.includes(value as BridgeOperation);
}

export function normaliseOperation(value: string | null | undefined): BridgeOperation {
  return value && isAllowedOperation(value) ? value : "inspect";
}

export function isSafeProjectPath(projectPath: string): boolean {
  const trimmed = projectPath.trim();
  return (
    trimmed.length > 4 &&
    trimmed.length < 500 &&
    trimmed.startsWith("/") &&
    !trimmed.split("/").includes("..") &&
    !/[\u0000\r\n]/.test(trimmed)
  );
}

export function isLocalBridgeUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    const loopbackHosts = ["127.0.0.1", "localhost", "::1", "[::1]"];
    return parsed.protocol === "http:" && loopbackHosts.includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function redactSecrets(value: string): string {
  return value
    .replace(/(?:ghp|github_pat|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}/gi, "[UKRYTY_TOKEN]")
    .replace(/(?:Bearer\s+|authorization\s*[:=]\s*Bearer\s+)[A-Za-z0-9._~+/=-]{20,}/gi, "[UKRYTY_TOKEN]")
    .replace(/(?:api[_-]?key|token|password|secret)\s*[:=]\s*[^\s,;]+/gi, "$1=[UKRYTE]")
    .replace(/-----BEGIN [^-]+-----[\s\S]+?-----END [^-]+-----/g, "[UKRYTY_KLUCZ]");
}

export function describeOperation(operation: BridgeOperation): string {
  const descriptions: Record<BridgeOperation, string> = {
    health: "sprawdzenie lokalnego Mostu Termuxa",
    inspect: "analiza wskazanego katalogu projektu",
    publish: "utworzenie lub aktualizacja repozytorium GitHub",
    start_build: "uruchomienie zdefiniowanego procesu budowania APK",
    build_status: "odczyt wyniku zdalnego budowania",
    download_apk: "pobranie gotowego artefaktu APK do urządzenia",
    validate_apk: "sprawdzenie integralności pobranego pliku APK",
    cancel_build: "zatrzymanie trwającego workflow budowania",
    apply_patch: "zastosowanie zatwierdzonej poprawki w kodzie projektu",
    list_files: "odczyt listy plików projektu",
    read_file: "odczyt konkretnego pliku tekstowego projektu",
    write_file: "zapis konkretnego pliku tekstowego projektu",
    search_files: "wyszukanie tekstu w plikach projektu",
    git_status: "odczyt statusu Git workspace",
    git_diff: "odczyt bieżącego diffu Git",
    run_task: "uruchomienie zweryfikowanego zadania projektu w Termuxie",
  };
  return descriptions[operation];
}
