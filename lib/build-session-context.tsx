import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { checkBridge, executeBridgeOperation, type ExecuteInput } from "./bridge-client";
import { describeOperation, isSafeProjectPath } from "./forge-policy";
import { clearBridgeSettings, loadBridgeSettings, loadBuildSession, saveBridgeSettings, saveBuildSession } from "./forge-storage";
import { createSession, type BridgeOperation, type BridgeResult, type BridgeSettings, type BuildSession } from "./forge-types";

type BridgeState = "unknown" | "checking" | "ready" | "offline";

function failureFingerprint(value: string) {
  return value.replace(/\d+/g, "#").replace(/\s+/g, " ").trim().slice(0, 220);
}

type SessionContextValue = {
  settings: BridgeSettings;
  session: BuildSession | null;
  bridgeState: BridgeState;
  loading: boolean;
  lastError: string | null;
  saveConnection: (settings: BridgeSettings) => Promise<void>;
  clearConnection: () => Promise<void>;
  testConnection: () => Promise<boolean>;
  startSession: (projectPath: string, repository: string) => void;
  runOperation: (
    operation: Exclude<BridgeOperation, "health">,
    patch?: string,
    idempotencyKey?: string,
    extra?: Omit<Partial<ExecuteInput>, "operation" | "projectPath" | "repository" | "runId" | "patch" | "idempotencyKey">,
  ) => Promise<BridgeResult>;
  cancelBuild: (runId?: string) => Promise<BridgeResult>;
  setAutomationState: (state: NonNullable<BuildSession["automation"]>) => void;
  appendNote: (note: string) => void;
  editorFile: string;
  editorContent: string;
  setEditorContext: (file: string, content: string) => void;
};

const BuildSessionContext = createContext<SessionContextValue | null>(null);

function updateStepStatus(session: BuildSession, id: string, status: "active" | "success" | "failed") {
  return {
    ...session,
    steps: session.steps.map((step) => (step.id === id ? { ...step, status } : step)),
  };
}

export function BuildSessionProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BridgeSettings>({
    baseUrl: "http://127.0.0.1:46321",
    pairingKey: "",
    autoApprove: false,
    autoRepair: false,
  });
  const [session, setSession] = useState<BuildSession | null>(null);
  const [bridgeState, setBridgeState] = useState<BridgeState>("unknown");
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const [automationState, setAutomationStateValue] = useState<NonNullable<BuildSession["automation"]>>("idle");
  const [editorFile, setEditorFile] = useState("");
  const [editorContent, setEditorContent] = useState("");

  useEffect(() => {
    Promise.all([loadBridgeSettings(), loadBuildSession()])
      .then(([storedSettings, storedSession]) => {
        setSettings(storedSettings);
        if (storedSession) {
          setSession(storedSession);
          setAutomationStateValue(storedSession.automation || "idle");
        }
      })
      .catch(() => setLastError("Nie udało się odczytać lokalnych ustawień."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (session) void saveBuildSession(session);
  }, [session]);

  const saveConnection = useCallback(async (nextSettings: BridgeSettings) => {
    await saveBridgeSettings(nextSettings);
    setSettings({ ...nextSettings, baseUrl: nextSettings.baseUrl.trim(), pairingKey: nextSettings.pairingKey.trim() });
    setBridgeState("unknown");
    setLastError(null);
  }, []);

  const clearConnection = useCallback(async () => {
    await clearBridgeSettings();
    setSettings({ baseUrl: "http://127.0.0.1:46321", pairingKey: "", autoApprove: false, autoRepair: false });
    setBridgeState("unknown");
    setLastError(null);
  }, []);

  const testConnection = useCallback(async () => {
    setBridgeState("checking");
    setLastError(null);
    try {
      const result = await checkBridge(settings);
      if (!result.ok) throw new Error(result.output);
      setBridgeState("ready");
      return true;
    } catch (error) {
      setBridgeState("offline");
      setLastError(error instanceof Error ? error.message : "Nie można połączyć się z Mostem.");
      return false;
    }
  }, [settings]);

  const startSession = useCallback((projectPath: string, repository: string) => {
    if (!isSafeProjectPath(projectPath)) {
      throw new Error("Podaj bezwzględną ścieżkę Termuxa bez fragmentu '..'.");
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(repository.trim())) {
      throw new Error("Nazwa repozytorium może zawierać litery, cyfry, kropkę, myślnik i podkreślenie.");
    }
    setSession(createSession(projectPath, repository));
    setLastError(null);
  }, []);

  const appendNote = useCallback((note: string) => {
    setSession((current) => (current ? { ...current, logs: [...current.logs, note].slice(-80) } : current));
  }, []);

  const setEditorContext = useCallback((file: string, content: string) => {
    setEditorFile(file);
    setEditorContent(content.slice(0, 20000));
  }, []);

  const setAutomationState = useCallback((state: NonNullable<BuildSession["automation"]>) => {
    setAutomationStateValue(state);
    setSession((current) => (current ? { ...current, automation: state } : current));
  }, []);

  const cancelBuild = useCallback(async (runId?: string) => {
    const currentSession = session;
    const activeRunId = runId || currentSession?.runId;
    if (!currentSession || !activeRunId) throw new Error("Brak aktywnego przebiegu do zatrzymania.");
    const result = await executeBridgeOperation(settings, {
      operation: "cancel_build",
      projectPath: currentSession.projectPath,
      repository: currentSession.repository,
      runId: activeRunId,
    });
    setAutomationState("stopped");
    appendNote(result.output);
    return result;
  }, [session, settings, setAutomationState, appendNote]);

  const runOperation = useCallback(
    async (
      operation: Exclude<BridgeOperation, "health">,
      patch?: string,
      idempotencyKey?: string,
      extra?: Omit<Partial<ExecuteInput>, "operation" | "projectPath" | "repository" | "runId" | "patch" | "idempotencyKey">,
    ) => {
      if (!session) throw new Error("Najpierw utwórz zadanie budowania.");
      setLastError(null);
      setSession((current) =>
        current
          ? {
              ...updateStepStatus(current, operation, "active"),
              attempts: (current.attempts || 0) + 1,
              lastOperation: operation,
              logs: [...current.logs, `Rozpoczęto: ${describeOperation(operation)}.`],
            }
          : current,
      );
      try {
        const result = await executeBridgeOperation(settings, {
          operation,
          projectPath: session.projectPath,
          repository: session.repository,
          runId: session.runId,
          patch,
          idempotencyKey: idempotencyKey || (operation === "start_build" ? `${session.id}:start_build:${Date.now()}` : undefined),
          ...extra,
        });
        if (!result.ok || (result.completed && result.success === false)) throw new Error(result.output);
        setSession((current) => {
          if (!current) return current;
          const nextStatus = operation === "build_status" && !result.completed ? "active" : "success";
          const updated = updateStepStatus(current, operation, nextStatus);
          const sourceChanged = operation === "apply_patch" || operation === "write_file";
          const invalidatedSteps = sourceChanged
            ? updated.steps.map((step) =>
                ["publish", "start_build", "build_status", "download_apk"].includes(step.id)
                  ? { ...step, status: "pending" as const }
                  : step,
              )
            : updated.steps;
          return {
            ...updated,
            steps: invalidatedSteps,
            repository: result.repository || current.repository,
            runId: sourceChanged ? undefined : (result.runId || current.runId),
            artifactPath: sourceChanged ? undefined : (result.artifactPath || current.artifactPath),
            diagnostics: operation === "inspect" ? result.output : current.diagnostics,
            lastObservedAt: new Date().toISOString(),
            lastConclusion: sourceChanged ? undefined : (result.conclusion || current.lastConclusion),
            logs: [...updated.logs, result.output].slice(-80),
          };
        });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Wykonanie operacji nie powiodło się.";
        setSession((current) =>
          current
            ? {
                ...updateStepStatus(current, operation, "failed"),
                lastObservedAt: new Date().toISOString(),
                failureHistory: [...new Set([...(current.failureHistory || []), failureFingerprint(message)])].slice(-10),
                logs: [...current.logs, `Błąd: ${message}`].slice(-80),
              }
            : current,
        );
        setLastError(message);
        throw error;
      }
    },
    [session, settings],
  );

  const value = useMemo(
    () => ({
      settings,
      session: session ? { ...session, automation: automationState } : session,
      bridgeState,
      loading,
      lastError,
      saveConnection,
      clearConnection,
      testConnection,
      startSession,
      runOperation,
      cancelBuild,
      setAutomationState,
      appendNote,
      editorFile,
      editorContent,
      setEditorContext,
    }),
    [settings, session, automationState, bridgeState, loading, lastError, saveConnection, clearConnection, testConnection, startSession, runOperation, cancelBuild, setAutomationState, appendNote, editorFile, editorContent, setEditorContext],
  );

  return <BuildSessionContext.Provider value={value}>{children}</BuildSessionContext.Provider>;
}

export function useBuildSession() {
  const context = useContext(BuildSessionContext);
  if (!context) throw new Error("useBuildSession musi być użyty wewnątrz BuildSessionProvider.");
  return context;
}
