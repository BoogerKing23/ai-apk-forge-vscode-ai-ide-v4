import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type Tone = "primary" | "secondary" | "danger";
type Status = "ready" | "waiting" | "offline" | "idle" | "success" | "failed";

export function ActionButton({
  label,
  onPress,
  tone = "primary",
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  tone?: Tone;
  disabled?: boolean;
  loading?: boolean;
}) {
  const className =
    tone === "primary"
      ? "bg-primary"
      : tone === "danger"
        ? "bg-error"
        : "bg-surface border border-border";
  const textClassName = tone === "secondary" ? "text-foreground" : "text-background";
  const backgroundColor = tone === "primary" ? "#56E0C0" : tone === "danger" ? "#FF718B" : "#13233A";
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor,
          borderWidth: tone === "secondary" ? 1 : 0,
          borderColor: "#28415E",
          opacity: disabled || loading ? 0.45 : pressed ? 0.76 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      {loading ? <ActivityIndicator color={tone === "secondary" ? "#F4F7FB" : "#09111F"} /> : <Text className={`text-[15px] font-bold ${textClassName}`}>{label}</Text>}
    </Pressable>
  );
}

export function SectionTitle({ eyebrow, title, detail }: { eyebrow?: string; title: string; detail?: string }) {
  return (
    <View className="gap-1">
      {eyebrow ? <Text className="text-xs font-bold uppercase tracking-[1.4px] text-primary">{eyebrow}</Text> : null}
      <Text className="text-[27px] font-bold leading-8 text-foreground">{title}</Text>
      {detail ? <Text className="text-[15px] leading-5 text-muted">{detail}</Text> : null}
    </View>
  );
}

export function StatusPill({ status, label }: { status: Status; label: string }) {
  const color =
    status === "ready" || status === "success"
      ? "bg-success"
      : status === "waiting"
        ? "bg-warning"
        : status === "offline" || status === "failed"
          ? "bg-error"
          : "bg-border";
  return (
    <View className="flex-row items-center gap-2 self-start rounded-full bg-surface px-3 py-1.5">
      <View className={`h-2 w-2 rounded-full ${color}`} />
      <Text className="text-xs font-semibold text-foreground">{label}</Text>
    </View>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "error"; children: ReactNode }) {
  const classes = tone === "warning" ? "border-warning" : tone === "error" ? "border-error" : "border-primary";
  return <View className={`rounded-2xl border bg-surface px-4 py-3 ${classes}`}>{children}</View>;
}
