import { useState } from "react";
import { Alert, Modal, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { ActionButton, Notice, SectionTitle, StatusPill } from "@/components/forge-ui";
import { useBuildSession } from "@/lib/build-session-context";

export default function HomeScreen() {
  const router = useRouter();
  const { bridgeState, lastError, loading, saveConnection, session, settings, startSession, testConnection } = useBuildSession();
  const [projectPath, setProjectPath] = useState(session?.projectPath ?? "");
  const [repository, setRepository] = useState(session?.repository ?? "");
  const [testing, setTesting] = useState(false);
  const [pairingKey, setPairingKey] = useState(settings.pairingKey);
  const [settingUp, setSettingUp] = useState(false);

  const bridgeLabel = bridgeState === "ready" ? "Most Termuxa gotowy" : bridgeState === "checking" ? "Sprawdzanie Mostu" : bridgeState === "offline" ? "Most niedostępny" : "Most niezweryfikowany";
  const bridgeTone = bridgeState === "ready" ? "ready" : bridgeState === "checking" ? "waiting" : bridgeState === "offline" ? "offline" : "idle";

  const handleTest = async () => {
    setTesting(true);
    await testConnection();
    setTesting(false);
  };

  const createJob = () => {
    try {
      startSession(projectPath, repository);
      router.push("/run" as any);
    } catch (error) {
      Alert.alert("Sprawdź dane", error instanceof Error ? error.message : "Nie udało się utworzyć zadania.");
    }
  };

  const completeOnboarding = async () => {
    if (pairingKey.trim().length < 24) {
      Alert.alert("Klucz jest zbyt krótki", "Wprowadź klucz parowania Mostu Termuxa o długości co najmniej 24 znaków.");
      return;
    }
    setSettingUp(true);
    try {
      await saveConnection({ ...settings, pairingKey: pairingKey.trim() });
      await testConnection();
    } finally {
      setSettingUp(false);
    }
  };

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ paddingTop: 18, paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
        <View className="gap-5">
          <SectionTitle eyebrow="AI APK Forge" title="Od katalogu do APK." detail="Kontroluj publikację GitHub i budowanie z własnego telefonu." />

          <View className="rounded-3xl bg-surface p-5 border border-border gap-4">
            <View className="flex-row items-center justify-between gap-3">
              <View className="gap-1 flex-1"><Text className="text-base font-bold text-foreground">Połączenie lokalne</Text><Text className="text-sm text-muted">Termux działa tylko przez 127.0.0.1.</Text></View>
              <StatusPill status={bridgeTone} label={bridgeLabel} />
            </View>
            <ActionButton label="Sprawdź Most Termuxa" onPress={handleTest} tone="secondary" loading={testing || loading} />
          </View>

          {lastError ? <Notice tone="error"><Text className="text-sm leading-5 text-foreground">{lastError}</Text></Notice> : null}

          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Nowe zadanie</Text>
            <View className="rounded-3xl bg-surface p-4 border border-border gap-3">
              <View className="gap-2"><Text className="text-xs font-bold uppercase tracking-wide text-muted">Katalog projektu w Termuxie</Text><TextInput value={projectPath} onChangeText={setProjectPath} placeholder="/data/data/com.termux/files/home/projekty/moj-projekt" placeholderTextColor="#71839A" autoCapitalize="none" autoCorrect={false} className="rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground font-mono" /></View>
              <View className="gap-2"><Text className="text-xs font-bold uppercase tracking-wide text-muted">Nazwa repozytorium</Text><TextInput value={repository} onChangeText={setRepository} placeholder="moja-aplikacja" placeholderTextColor="#71839A" autoCapitalize="none" autoCorrect={false} className="rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground" /></View>
              <Text className="text-xs leading-4 text-muted">Token GitHub pozostaje w Termuxie. Ten formularz nie wysyła go do AI.</Text>
              <ActionButton label="Utwórz bezpieczny plan" onPress={createJob} />
            </View>
          </View>

          <Notice tone="warning"><Text className="text-sm leading-5 text-foreground"><Text className="font-bold">Ważne: </Text>aplikacja nie przyjmuje dowolnych komend powłoki. AI tworzy plan, a Most wykonuje tylko zdefiniowane działania na wybranym repozytorium.</Text></Notice>

          <View className="rounded-2xl px-1 py-2 gap-1"><Text className="text-sm font-semibold text-foreground">Klucz połączenia</Text><Text className="text-sm leading-5 text-muted">Adres Mostu i klucz parowania ustawisz w zakładce Ustawienia. {settings.pairingKey ? "Klucz jest zapisany lokalnie." : "Brak zapisanego klucza."}</Text></View>
        </View>
      </ScrollView>
      <Modal visible={!loading && !settings.pairingKey} transparent animationType="slide" statusBarTranslucent>
        <View className="flex-1 justify-end bg-black/70 p-4">
          <View className="rounded-3xl border border-border bg-surface p-5 gap-4">
            <Text className="text-xs font-bold uppercase tracking-[1.4px] text-primary">Pierwsze uruchomienie</Text>
            <Text className="text-2xl font-bold leading-8 text-foreground">Podaj klucz API Mostu.</Text>
            <Text className="text-sm leading-5 text-muted">Jest to klucz parowania lokalnego Mostu Termuxa, a nie token GitHub ani klucz modelu AI. GitHub pozostaje skonfigurowany tylko w Termuxie, a asystent AI działa po stronie serwera.</Text>
            <TextInput value={pairingKey} onChangeText={setPairingKey} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="co najmniej 24 znaki" placeholderTextColor="#71839A" className="rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground" />
            <ActionButton label="Zapisz klucz i połącz" onPress={completeOnboarding} loading={settingUp} />
            <Text className="text-xs leading-4 text-muted">Nie masz Mostu? Instrukcję instalacji znajdziesz w projekcie w pliku docs/TERMUX_GITHUB_SETUP.md.</Text>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
