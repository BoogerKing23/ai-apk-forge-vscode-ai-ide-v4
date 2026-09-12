import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";

import { ActionButton, Notice, SectionTitle, StatusPill } from "@/components/forge-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useBuildSession } from "@/lib/build-session-context";
import { redactSecrets } from "@/lib/forge-policy";
import { trpc } from "@/lib/trpc";

export default function AssistantScreen() {
  const { session, runOperation, appendNote, editorFile, editorContent } = useBuildSession();
  const [request, setRequest] = useState("");
  const [log, setLog] = useState("");
  const [applying, setApplying] = useState(false);
  const repair = trpc.forge.planRepair.useMutation();

  const requestRepair = async () => {
    if (!session) return;
    try {
      let refreshedDiagnostics = session.diagnostics || "Brak diagnostyki projektu.";
      try {
        const inspected = await runOperation("inspect");
        refreshedDiagnostics = inspected.output || refreshedDiagnostics;
      } catch {
        // AI może nadal użyć ostatniej znanej diagnostyki.
      }
      if (session.runId) {
        try {
          const status = await runOperation("build_status");
          refreshedDiagnostics = `${refreshedDiagnostics}\n\n${status.output}`;
        } catch {
          // Brak aktualnego workflow nie blokuje analizy kodu.
        }
      }
      const source = redactSecrets(log.trim() || session.logs.slice(-10).join("\n"));
      if (!source) return Alert.alert("Brak kontekstu", "Wklej błąd albo uruchom etap budowania, który utworzy log.");
      const plan = await repair.mutateAsync({
        projectPath: session.projectPath,
        repository: session.repository,
        log: source,
        diagnostics: refreshedDiagnostics,
        failureHistory: session.failureHistory || [],
        completedSteps: session.steps.filter((step) => step.status === "success").map((step) => step.id),
        allowAutoPatch: false,
        currentFile: editorFile,
        currentContent: redactSecrets(editorContent),
        userRequest: request.trim(),
      });
      appendNote(`AI (${Math.round(plan.confidence * 100)}% pewności, ryzyko ${plan.risk}): ${plan.summary}`);
    } catch {
      Alert.alert("Analiza niedostępna", "Nie udało się teraz uzyskać planu naprawczego.");
    }
  };

  const applyPatch = () => {
    if (!repair.data?.patch || !session) return;
    Alert.alert("Potwierdź zmianę kodu", repair.data.patchSummary || "AI proponuje zmianę w projekcie.", [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Zastosuj diff",
        onPress: async () => {
          setApplying(true);
          try {
            await runOperation("apply_patch", repair.data?.patch);
            appendNote("Zastosowano zatwierdzoną poprawkę AI. Uruchom ponownie analizę/build, aby zweryfikować wynik.");
          } finally {
            setApplying(false);
          }
        },
      },
    ]);
  };

  if (!session) {
    return <ScreenContainer className="p-5"><SectionTitle eyebrow="Naprawa AI" title="Najpierw utwórz zadanie" detail="Asystent działa na wybranym projekcie oraz na kontekście z wbudowanego edytora." /></ScreenContainer>;
  }

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ paddingTop: 18, paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
        <View className="gap-4">
          <SectionTitle eyebrow="AI ENGINEER" title="AI widzi projekt, nie tylko błąd." detail="Przekazywany kontekst obejmuje stan Git/Termux, środowisko builda, workflow oraz aktualnie otwarty plik z edytora. Sekrety są maskowane." />

          <View className="rounded-3xl border border-primary bg-surface p-4 gap-3">
            <Text className="text-xs font-bold uppercase tracking-wide text-muted">Kontekst edytora</Text>
            <View className="flex-row items-center justify-between gap-3">
              <Text numberOfLines={1} className="flex-1 font-mono text-sm font-semibold text-foreground">{editorFile || "Brak otwartego pliku"}</Text>
              <StatusPill status={editorContent ? "success" : "idle"} label={editorContent ? `${editorContent.length} znaków` : "brak kodu"} />
            </View>
            <Text className="text-xs leading-4 text-muted">AI dostaje bieżący bufor tylko jako kontekst diagnostyczny. Zmiany są proponowane jako mały diff i muszą przejść walidację Mostu.</Text>
          </View>

          <View className="rounded-3xl border border-border bg-surface p-4 gap-2">
            <Text className="text-xs font-bold uppercase tracking-wide text-muted">Polecenie dla AI</Text>
            <TextInput value={request} onChangeText={setRequest} multiline numberOfLines={3} textAlignVertical="top" placeholder="Np. „Znajdź przyczynę błędu Gradle i przygotuj najmniejszą poprawkę bez ruszania konfiguracji sekretów.”" placeholderTextColor="#71839A" className="min-h-20 rounded-xl border border-border bg-background px-3 py-3 text-xs leading-5 text-foreground" />
          </View>

          <View className="rounded-3xl border border-border bg-surface p-4 gap-2">
            <Text className="text-xs font-bold uppercase tracking-wide text-muted">Log błędu / wynik builda</Text>
            <TextInput value={log} onChangeText={setLog} multiline numberOfLines={9} textAlignVertical="top" placeholder="Wklej błąd Gradle, GitHub Actions, Java, TypeScript lub Termuxa…" placeholderTextColor="#71839A" autoCapitalize="none" autoCorrect={false} className="min-h-44 rounded-xl border border-border bg-background px-3 py-3 font-mono text-[11px] leading-5 text-foreground" />
            <ActionButton label="Przeanalizuj i zaplanuj naprawę" onPress={requestRepair} loading={repair.isPending} />
          </View>

          {repair.data ? (
            <View className="gap-3">
              <View className="rounded-3xl border border-primary bg-surface p-4 gap-3">
                <StatusPill status={repair.data.risk === "high" ? "failed" : repair.data.risk === "low" ? "success" : "waiting"} label={`${Math.round(repair.data.confidence * 100)}% • ryzyko ${repair.data.risk}`} />
                <Text className="text-lg font-bold text-foreground">{repair.data.summary}</Text>
                <Text className="text-sm leading-5 text-muted">{repair.data.diagnosis}</Text>
                <View className="rounded-xl bg-background p-3 gap-1">
                  <Text className="text-xs font-bold uppercase tracking-wide text-muted">Warunek sukcesu</Text>
                  <Text className="text-sm leading-5 text-foreground">{repair.data.successCondition}</Text>
                </View>
                <View className="rounded-xl bg-background p-3 gap-1">
                  <Text className="text-xs font-bold uppercase tracking-wide text-muted">Następna operacja</Text>
                  <Text className="text-sm font-semibold text-foreground">{repair.data.nextOperation}</Text>
                </View>
              </View>
              {repair.data.patch ? (
                <View className="rounded-3xl border border-warning bg-surface p-4 gap-3">
                  <Text className="text-base font-bold text-foreground">Proponowany diff</Text>
                  <Text className="text-sm text-muted">{repair.data.patchSummary}</Text>
                  <View className="max-h-72 rounded-xl bg-background p-3"><Text selectable className="font-mono text-[11px] leading-4 text-foreground">{repair.data.patch}</Text></View>
                  <ActionButton label="Zastosuj zatwierdzony diff" onPress={applyPatch} tone="secondary" loading={applying} />
                </View>
              ) : (
                <Notice tone="warning"><Text className="text-sm leading-5 text-foreground">AI nie ma wystarczających dowodów na bezpieczny diff. Najpierw wykonaj wskazaną operację w „Przebieg” albo otwórz właściwy plik w „Kod”.</Text></Notice>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
