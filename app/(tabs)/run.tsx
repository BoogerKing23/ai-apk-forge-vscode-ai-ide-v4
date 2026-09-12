import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { ActionButton, Notice, SectionTitle, StatusPill } from "@/components/forge-ui";
import { useBuildSession } from "@/lib/build-session-context";
import { redactSecrets } from "@/lib/forge-policy";
import { trpc } from "@/lib/trpc";
import type { BuildStep } from "@/lib/forge-types";

const operationLabels: Record<BuildStep["id"], string> = {
  inspect: "Analizuj katalog",
  publish: "Opublikuj kod",
  start_build: "Uruchom budowanie",
  build_status: "Sprawdź wynik",
  download_apk: "Pobierz APK",
};

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function isTransientError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|timed out|aborted|ECONNRESET|ECONNREFUSED|network|503|502|Most nie odpowiada/i.test(message);
}

export default function RunScreen() {
  const { session, settings, runOperation, cancelBuild, setAutomationState, appendNote, lastError, editorFile, editorContent } = useBuildSession();
  const [running, setRunning] = useState<BuildStep["id"] | null>(null);
  const [autoRunning, setAutoRunning] = useState(false);
  const stopRequested = useRef(false);
  const repair = trpc.forge.planRepair.useMutation();
  const nextStep = useMemo(() => session?.steps.find((step) => step.status !== "success") ?? null, [session]);
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const execute = async (step: BuildStep) => {
    const run = async () => {
      setRunning(step.id);
      try {
        await runOperation(step.id);
      } catch {
        // Błąd jest zapisywany w sesji i pokazany w interfejsie.
      } finally {
        setRunning(null);
      }
    };
    if (settings.autoApprove) return run();
    Alert.alert("Potwierdź operację", `${operationLabels[step.id]}: ${step.subtitle}`, [
      { text: "Anuluj", style: "cancel" },
      { text: "Wykonaj", onPress: run },
    ]);
  };

  const invokeWithRetry = async (operation: Exclude<BuildStep["id"], never>, idempotencyKey?: string) => {
    for (let retry = 0; retry < 3; retry += 1) {
      try {
        return await runOperation(operation, undefined, idempotencyKey);
      } catch (error) {
        if (!isTransientError(error) || retry === 2) throw error;
        appendNote(`Chwilowy błąd połączenia. Ponawiam ${operationLabels[operation]} za ${2 ** retry}s.`);
        await sleep(1000 * 2 ** retry);
      }
    }
    throw new Error("Operacja nie została wykonana.");
  };

  const analyseFailure = async (log: string) => {
    const currentSession = sessionRef.current;
    if (!currentSession) return false;
    appendNote("AI analizuje ostatni błąd i wyznacza najbezpieczniejszy następny krok…");
    try {
      const plan = await repair.mutateAsync({
        projectPath: currentSession.projectPath,
        repository: currentSession.repository,
        log: redactSecrets(log).slice(-12000),
        completedSteps: currentSession.steps.filter((step) => step.status === "success").map((step) => step.id),
        diagnostics: currentSession.diagnostics || "Brak wcześniejszej diagnostyki.",
        failureHistory: currentSession.failureHistory || [],
        allowAutoPatch: settings.autoRepair,
        currentFile: editorFile,
        currentContent: redactSecrets(editorContent),
        userRequest: "Napraw build automatycznie, zastosuj minimalną zmianę i zweryfikuj wynik nowym przebiegiem GitHub Actions.",
      });
      appendNote(`Plan AI (${Math.round(plan.confidence * 100)}% pewności, ryzyko ${plan.risk}): ${plan.summary} Następnie: ${plan.nextOperation}. Warunek: ${plan.successCondition}`);
      if (plan.patch && settings.autoApprove && !plan.requiresApproval) {
        appendNote("Tryb automatyczny zatwierdził wyłącznie bezpieczny diff zwrócony przez politykę AI.");
        await runOperation("apply_patch", plan.patch);
        return true;
      }
      const safeFollowUp = ["inspect", "publish", "start_build", "build_status", "download_apk"].includes(plan.nextOperation) ? plan.nextOperation as BuildStep["id"] : null;
      if (!plan.patch && settings.autoApprove && safeFollowUp) {
        appendNote(`AI wybrało dozwolony następny krok: ${operationLabels[safeFollowUp]}.`);
        await invokeWithRetry(safeFollowUp);
        return true;
      }
      appendNote(plan.patch ? "AI przygotowało diff, ale wymaga on ręcznej zgody w zakładce Naprawa AI." : "AI nie wybrało bezpiecznej operacji do automatycznego wykonania; wymagane jest sprawdzenie planu.");
      return false;
    } catch {
      appendNote("Analiza AI jest chwilowo niedostępna. Przebieg został zatrzymany bez wykonywania nieznanej komendy.");
      return false;
    }
  };

  const runAutonomously = async () => {
    if (!session || autoRunning) return;
    stopRequested.current = false;
    setAutoRunning(true);
    setAutomationState("running");
    appendNote("Start pętli automatycznej: obserwacja → analiza → operacja → weryfikacja. Limit: 20 prób i 10 minut.");
    const startedAt = Date.now();
    let attempt = 0;
    try {
      if (session.artifactPath && session.automation === "succeeded") {
        appendNote("Odtworzono zakończoną sesję — APK jest już dostępne na urządzeniu.");
        return;
      }
      while (attempt < 20 && Date.now() - startedAt < 10 * 60 * 1000 && !stopRequested.current) {
        attempt += 1;
        try {
          for (const operation of ["inspect", "publish", "start_build"] as const) {
            if (stopRequested.current) return;
            const currentSession = sessionRef.current;
            const completed = currentSession?.steps.find((step) => step.id === operation)?.status === "success";
            const activeWorkflow = operation === "start_build" && Boolean(currentSession?.runId);
            if (completed || activeWorkflow) {
              appendNote(`Wznowienie: pomijam zakończony etap ${operationLabels[operation]}.`);
              continue;
            }
            setRunning(operation);
            await invokeWithRetry(operation, `${session.id}:${operation}:attempt-${attempt}`);
          }
          setRunning("build_status");
          let buildCompleted = false;
          for (let poll = 0; poll < 90 && !stopRequested.current; poll += 1) {
            const status = await invokeWithRetry("build_status");
            if (status.completed) {
              if (!status.success) throw new Error(status.output);
              buildCompleted = true;
              break;
            }
            await sleep(4000);
          }
          if (stopRequested.current) return;
          if (!buildCompleted) throw new Error("Workflow nie zakończył się w limicie 6 minut.");
          setRunning("download_apk");
          await invokeWithRetry("download_apk");
          setAutomationState("succeeded");
          appendNote("Pętla zakończona sukcesem: APK pobrano i zweryfikowano.");
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Nieznany błąd etapu.";
          appendNote(`Próba ${attempt}/20 zakończona błędem: ${message}`);
          const repaired = await analyseFailure(message);
          if (!repaired) {
            setAutomationState("paused");
            return;
          }
          appendNote(`AI przygotowało kolejną próbę (${attempt + 1}/20).`);
        } finally {
          setRunning(null);
        }
      }
      if (!stopRequested.current) {
        setAutomationState("failed");
        appendNote("Pętla zatrzymana: osiągnięto limit 20 prób lub 10 minut pracy.");
      }
    } finally {
      setAutoRunning(false);
      setRunning(null);
    }
  };

  const stopAutomation = async () => {
    stopRequested.current = true;
    setAutomationState("stopped");
    appendNote("Użytkownik zatrzymał pętlę automatyczną.");
    const activeRunId = session?.runId;
    if (activeRunId) {
      try {
        await cancelBuild();
      } catch {
        appendNote("Nie udało się wysłać anulowania do GitHub Actions; sprawdź status workflow ręcznie.");
      }
    }
    setAutoRunning(false);
    setRunning(null);
  };

  if (!session) {
    return <ScreenContainer className="p-5"><View className="gap-4"><SectionTitle eyebrow="Przebieg" title="Brak zadania" detail="Wróć do zakładki Start, aby wskazać katalog Termuxa i repozytorium." /></View></ScreenContainer>;
  }

  const completedSteps = session.steps.filter((step) => step.status === "success").length;
  const progressPercent = Math.round((completedSteps / session.steps.length) * 100);
  const automationLabel = session.automation === "running" ? "AI pracuje" : session.automation === "succeeded" ? "APK gotowe" : session.automation === "paused" ? "Oczekuje na zgodę" : session.automation === "stopped" ? "Zatrzymano" : session.automation === "failed" ? "Limit osiągnięty" : "Gotowe do startu";
  const automationStatus = session.automation === "succeeded" ? "success" : session.automation === "running" ? "waiting" : session.automation === "paused" || session.automation === "failed" ? "failed" : session.automation === "stopped" ? "offline" : "idle";

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <FlatList
        data={session.steps}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 18, paddingBottom: 28, gap: 12 }}
        ListHeaderComponent={<View className="gap-4 mb-2"><SectionTitle eyebrow="Przebieg" title="AI pracuje do wyniku." detail={session.repository} /><View className="rounded-2xl border border-border bg-surface p-4 gap-3"><View className="flex-row items-center justify-between gap-3"><View className="flex-1 gap-1"><Text className="text-xs font-bold uppercase tracking-wide text-muted">Tryb automatyzacji</Text><Text className="text-base font-bold text-foreground">{automationLabel}</Text></View><StatusPill status={automationStatus} label={`${session.attempts || 0} prób`} /></View><Text numberOfLines={2} className="font-mono text-xs leading-5 text-muted">{session.projectPath}</Text><View className="gap-1"><View className="h-2 overflow-hidden rounded-full bg-background"><View className="h-2 rounded-full bg-primary" style={{ width: `${progressPercent}%` }} /></View><Text className="text-right text-[11px] text-muted">{progressPercent}% zweryfikowane</Text></View>{autoRunning ? <ActionButton label="Zatrzymaj natychmiast" onPress={stopAutomation} tone="danger" /> : <ActionButton label={session.automation === "paused" || session.automation === "stopped" || session.automation === "running" ? "Wznów pętlę AI" : "Uruchom pętlę AI"} onPress={runAutonomously} />}</View>{lastError ? <Notice tone="error"><Text className="text-sm leading-5 text-foreground">{lastError}</Text></Notice> : null}{!autoRunning && nextStep ? <ActionButton label={settings.autoApprove ? `Uruchom: ${operationLabels[nextStep.id]}` : `Zatwierdź: ${operationLabels[nextStep.id]}`} onPress={() => execute(nextStep)} tone="secondary" loading={running === nextStep.id} /> : null}</View>}
        renderItem={({ item, index }) => {
          const status = item.status === "success" ? "success" : item.status === "active" ? "waiting" : item.status === "failed" ? "failed" : "idle";
          const label = item.status === "success" ? "Gotowe" : item.status === "active" ? "W toku" : item.status === "failed" ? "Wymaga naprawy" : `Etap ${index + 1}`;
          return <View className="rounded-2xl border border-border bg-surface p-4 gap-2"><View className="flex-row items-start justify-between gap-3"><View className="flex-1 gap-1"><Text className="text-base font-bold text-foreground">{item.title}</Text><Text className="text-sm leading-5 text-muted">{item.subtitle}</Text></View><StatusPill status={status} label={label} /></View>{item.status === "pending" && item === nextStep && !autoRunning ? <ActionButton label={operationLabels[item.id]} onPress={() => execute(item)} tone="secondary" loading={running === item.id} /> : null}</View>;
        }}
        ListFooterComponent={<View className="mt-2 gap-3">{session.artifactPath ? <Notice><Text className="text-sm font-bold text-foreground">APK zapisano i zweryfikowano</Text><Text className="mt-1 font-mono text-xs leading-5 text-muted">{session.artifactPath}</Text></Notice> : null}<View className="rounded-2xl border border-border bg-surface p-4 gap-2"><Text className="text-sm font-bold text-foreground">Dziennik obserwacji</Text><Text className="font-mono text-xs leading-5 text-muted">{session.logs.slice(-6).join("\n\n")}</Text></View></View>}
      />
    </ScreenContainer>
  );
}
