import { describe, expect, it } from "vitest";

import {
  isAllowedOperation,
  isLocalBridgeUrl,
  isSafeProjectPath,
  normaliseOperation,
  redactSecrets,
} from "../lib/forge-policy";

describe("polityka AI APK Forge", () => {
  it("dopuszcza wyłącznie zdefiniowane działania mostu", () => {
    expect(isAllowedOperation("inspect")).toBe(true);
    expect(isAllowedOperation("list_files")).toBe(true);
    expect(isAllowedOperation("read_file")).toBe(true);
    expect(isAllowedOperation("write_file")).toBe(true);
    expect(isAllowedOperation("search_files")).toBe(true);
    expect(isAllowedOperation("rm -rf /")).toBe(false);
    expect(normaliseOperation("zdalna-komenda")).toBe("inspect");
  });

  it("wymaga lokalnego adresu Mostu Termuxa", () => {
    expect(isLocalBridgeUrl("http://127.0.0.1:46321")).toBe(true);
    expect(isLocalBridgeUrl("http://192.168.1.20:46321")).toBe(false);
    expect(isLocalBridgeUrl("https://example.com")).toBe(false);
  });

  it("odrzuca ścieżki z próbą wyjścia poza katalog", () => {
    expect(isSafeProjectPath("/data/data/com.termux/files/home/projekty/demo")).toBe(true);
    expect(isSafeProjectPath("/data/data/com.termux/files/home/../sekret")).toBe(false);
    expect(isSafeProjectPath("relatywna/sciezka")).toBe(false);
  });

  it("maskuje tokeny przed pokazaniem lub analizą logu", () => {
    const redacted = redactSecrets("token=github_pat_0123456789abcdefghijklmnopqrstuwxyz i ghp_123456789012345678901234567890123456");
    expect(redacted).not.toContain("github_pat_");
    expect(redacted).not.toContain("ghp_");
    expect(redacted).toContain("[UKRYTY");
  });
});

describe("konfiguracja bez nowych sekretów", () => {
  it("utrzymuje techniczny znacznik poza żądaniami integracji", () => {
    expect(process.env.AI_APK_FORGE_NO_NEW_SECRET).toBe("not-used");
  });
});

it("nie używa znacznika konfiguracji jako klucza parowania", () => {
  expect(process.env.AI_APK_FORGE_NO_NEW_SECRET).not.toBe(process.env.AI_APK_FORGE_BRIDGE_KEY);
});
