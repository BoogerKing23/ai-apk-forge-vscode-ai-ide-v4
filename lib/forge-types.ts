export type StepStatus = "pending" | "active" | "success" | "failed";

export type BridgeOperation =
  | "health"
  | "inspect"
  | "publish"
  | "start_build"
  | "build_status"
  | "download_apk"
  | "validate_apk"
  | "cancel_build"
  | "apply_patch"
  | "list_files"
  | "read_file"
  | "write_file"
  | "search_files"
  | "git_status"
  | "git_diff"
  | "run_task";

export type BuildStepId = Exclude<BridgeOperation, "health" | "apply_patch" | "validate_apk" | "cancel_build">;

export interface BuildStep {
  id: BuildStepId;
  title: string;
  subtitle: string;
  status: StepStatus;
}

export interface BuildSession {
  id: string;
  projectPath: string;
  repository: string;
  createdAt: string;
  steps: BuildStep[];
  logs: string[];
  artifactPath?: string;
  runId?: string;
  automation?: "idle" | "running" | "paused" | "stopped" | "succeeded" | "failed";
  attempts?: number;
  lastOperation?: BridgeOperation;
  lastConclusion?: string;
  lastObservedAt?: string;
  failureHistory?: string[];
  diagnostics?: string;
}

export interface BridgeSettings {
  baseUrl: string;
  pairingKey: string;
  autoApprove: boolean;
  autoRepair: boolean;
}

export interface BridgeResult {
  ok: boolean;
  output: string;
  artifactPath?: string;
  runId?: string;
  repository?: string;
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
}

export const buildSteps: Omit<BuildStep, "status">[] = [
  {
    id: "inspect",
    title: "Analiza projektu",
    subtitle: "Kontrola katalogu, Git i wymaganych plików.",
  },
  {
    id: "publish",
    title: "Publikacja GitHub",
    subtitle: "Zatwierdzony zapis zmian oraz wysłanie kodu.",
  },
  {
    id: "start_build",
    title: "Uruchomienie budowania",
    subtitle: "Wyzwolenie zdefiniowanego workflow Android APK.",
  },
  {
    id: "build_status",
    title: "Wynik budowania",
    subtitle: "Odczyt statusu najnowszego przebiegu GitHub Actions.",
  },
  {
    id: "download_apk",
    title: "Pobranie APK",
    subtitle: "Zapis gotowego artefaktu w katalogu Pobrane.",
  },
];

export function createSession(projectPath: string, repository: string): BuildSession {
  return {
    id: `forge-${Date.now()}`,
    projectPath: projectPath.trim(),
    repository: repository.trim(),
    createdAt: new Date().toISOString(),
    steps: buildSteps.map((step) => ({ ...step, status: "pending" })),
    logs: ["Plan utworzony. Pierwszym krokiem jest analiza katalogu projektu."],
    automation: "idle",
    attempts: 0,
  };
}
