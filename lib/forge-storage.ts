import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { BridgeSettings, BuildSession } from "./forge-types";

const SETTINGS_KEY = "ai-apk-forge.settings.v1";
const PAIRING_KEY = "ai-apk-forge.pairing-key.v1";
const SESSION_KEY = "ai-apk-forge.build-session.v1";

const defaultSettings: BridgeSettings = {
  baseUrl: "http://127.0.0.1:46321",
  pairingKey: "",
  autoApprove: false,
  autoRepair: false,
};

type StoredSettings = Omit<BridgeSettings, "pairingKey">;

function webStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

async function readSecret(): Promise<string> {
  if (Platform.OS === "web") return webStorage()?.getItem(PAIRING_KEY) ?? "";
  return (await SecureStore.getItemAsync(PAIRING_KEY)) ?? "";
}

async function writeSecret(value: string): Promise<void> {
  if (Platform.OS === "web") {
    webStorage()?.setItem(PAIRING_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(PAIRING_KEY, value);
}

export async function loadBridgeSettings(): Promise<BridgeSettings> {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    const publicSettings: StoredSettings = stored
      ? (JSON.parse(stored) as StoredSettings)
      : { baseUrl: defaultSettings.baseUrl, autoApprove: false, autoRepair: false };
    return { ...defaultSettings, ...publicSettings, pairingKey: await readSecret() };
  } catch {
    return defaultSettings;
  }
}

export async function saveBridgeSettings(settings: BridgeSettings): Promise<void> {
  const publicSettings: StoredSettings = {
    baseUrl: settings.baseUrl.trim(),
    autoApprove: settings.autoApprove,
    autoRepair: settings.autoRepair,
  };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(publicSettings));
  await writeSecret(settings.pairingKey.trim());
}

export async function loadBuildSession(): Promise<BuildSession | null> {
  try {
    const stored = await AsyncStorage.getItem(SESSION_KEY);
    return stored ? (JSON.parse(stored) as BuildSession) : null;
  } catch {
    return null;
  }
}

export async function saveBuildSession(session: BuildSession | null): Promise<void> {
  if (!session) {
    await AsyncStorage.removeItem(SESSION_KEY);
    return;
  }
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearBridgeSettings(): Promise<void> {
  await AsyncStorage.removeItem(SETTINGS_KEY);
  if (Platform.OS === "web") {
    webStorage()?.removeItem(PAIRING_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(PAIRING_KEY);
}
