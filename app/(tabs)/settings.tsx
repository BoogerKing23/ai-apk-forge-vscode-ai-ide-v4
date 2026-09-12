import { useEffect, useState } from "react";
import { Alert, ScrollView, Switch, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { ActionButton, Notice, SectionTitle } from "@/components/forge-ui";
import { useBuildSession } from "@/lib/build-session-context";

export default function SettingsScreen() {
  const { settings, saveConnection, clearConnection, testConnection, bridgeState } = useBuildSession();
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [pairingKey, setPairingKey] = useState(settings.pairingKey);
  const [autoApprove, setAutoApprove] = useState(settings.autoApprove);
  const [autoRepair, setAutoRepair] = useState(settings.autoRepair);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setBaseUrl(settings.baseUrl); setPairingKey(settings.pairingKey); setAutoApprove(settings.autoApprove); setAutoRepair(settings.autoRepair); }, [settings]);

  const save = async () => {
    setSaving(true);
    try { await saveConnection({ baseUrl, pairingKey, autoApprove, autoRepair }); const connected = await testConnection(); if (!connected) Alert.alert("Zapisano", "Ustawienia zapisano, lecz Most jeszcze nie odpowiada."); } catch (error) { Alert.alert("Nie zapisano", error instanceof Error ? error.message : "Nie udało się zapisać ustawień."); } finally { setSaving(false); }
  };

  const clear = () => Alert.alert("Wyczyścić dane połączenia?", "Klucz parowania zostanie usunięty wyłącznie z tej aplikacji.", [{ text: "Anuluj", style: "cancel" }, { text: "Wyczyść", style: "destructive", onPress: () => { clearConnection(); setPairingKey(""); setBaseUrl("http://127.0.0.1:46321"); setAutoApprove(false); setAutoRepair(false); } }]);

  return <ScreenContainer className="px-5" edges={["top", "left", "right"]}><ScrollView contentContainerStyle={{ paddingTop: 18, paddingBottom: 28 }} keyboardShouldPersistTaps="handled"><View className="gap-5"><SectionTitle eyebrow="Ustawienia" title="Połączenie i zgody" detail={`Stan Mostu: ${bridgeState === "ready" ? "gotowy" : "niezweryfikowany"}.`} />
    <View className="rounded-3xl border border-border bg-surface p-4 gap-4"><View className="gap-2"><Text className="text-xs font-bold uppercase tracking-wide text-muted">Adres Mostu Termuxa</Text><TextInput value={baseUrl} onChangeText={setBaseUrl} autoCapitalize="none" autoCorrect={false} placeholder="http://127.0.0.1:46321" placeholderTextColor="#71839A" className="rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground" /></View><View className="gap-2"><Text className="text-xs font-bold uppercase tracking-wide text-muted">Klucz parowania</Text><TextInput value={pairingKey} onChangeText={setPairingKey} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="co najmniej 24 znaki" placeholderTextColor="#71839A" className="rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground" /></View><ActionButton label="Zapisz i sprawdź połączenie" onPress={save} loading={saving} /></View>
    <View className="rounded-3xl border border-border bg-surface p-4 gap-4"><View className="flex-row items-start gap-3"><View className="flex-1 gap-1"><Text className="text-base font-bold text-foreground">Uproszczone zatwierdzanie</Text><Text className="text-sm leading-5 text-muted">Kolejne standardowe etapy uruchamiasz jednym dotknięciem, bez dodatkowego okna potwierdzenia.</Text></View><Switch value={autoApprove} onValueChange={setAutoApprove} trackColor={{ false: "#28415E", true: "#56E0C0" }} /></View><View className="h-px bg-border" /><View className="flex-row items-start gap-3"><View className="flex-1 gap-1"><Text className="text-base font-bold text-foreground">Automatyczne poprawki kodu</Text><Text className="text-sm leading-5 text-muted">Gdy AI znajdzie mały, bezpieczny diff, może zastosować go i ponowić próbę. Wyłączone domyślnie.</Text></View><Switch value={autoRepair} onValueChange={setAutoRepair} trackColor={{ false: "#28415E", true: "#F2B24B" }} /></View></View>
    <Notice tone="warning"><Text className="text-sm leading-5 text-foreground"><Text className="font-bold">Instrukcja: </Text>zainstaluj GitHub CLI i Node.js w Termuxie, uruchom dostarczony plik mostu z własnym kluczem, a następnie wpisz ten sam klucz tutaj. Token GitHub pozostaje po stronie Termuxa.</Text></Notice><ActionButton label="Wyczyść lokalne ustawienia" onPress={clear} tone="danger" /></View></ScrollView></ScreenContainer>;
}
