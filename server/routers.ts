import { COOKIE_NAME } from "../shared/const.js";
import { invokeLLM, listLLMModels } from "./_core/llm";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

const repairInput = z.object({
  projectPath: z.string().min(1).max(500),
  repository: z.string().min(1).max(100),
  log: z.string().min(1).max(12000),
  completedSteps: z.array(z.string().max(40)).max(8),
  diagnostics: z.string().max(12000).default(""),
  failureHistory: z.array(z.string().max(240)).max(10).default([]),
  allowAutoPatch: z.boolean().default(false),
  currentFile: z.string().max(300).default(""),
  currentContent: z.string().max(20000).default(""),
  openFiles: z.array(z.object({ path: z.string().max(300), content: z.string().max(8000) })).max(8).default([]),
  userRequest: z.string().max(3000).default(""),
});

const repairPlan = z.object({
  summary: z.string().min(1).max(700),
  diagnosis: z.string().min(1).max(1600),
  nextOperation: z.enum(["inspect", "publish", "start_build", "build_status", "download_apk", "apply_patch", "run_task"]),
  patchSummary: z.string().max(800),
  patch: z.string().max(24000),
  requiresApproval: z.boolean(),
  confidence: z.number().min(0).max(1),
  risk: z.enum(["low", "medium", "high"]),
  successCondition: z.string().min(1).max(500),
});

function redactForModel(value: string) {
  return value
    .replace(/(?:ghp|github_pat|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}/gi, "[UKRYTY_TOKEN]")
    .replace(/(?:Bearer\s+|authorization\s*[:=]\s*Bearer\s+)[A-Za-z0-9._~+/=-]{20,}/gi, "[UKRYTY_TOKEN]")
    .replace(/(?:api[_-]?key|token|password|secret)\s*[:=]\s*[^\s,;]+/gi, "$1=[UKRYTE]")
    .replace(/-----BEGIN [^-]+-----[\s\S]+?-----END [^-]+-----/g, "[UKRYTY_KLUCZ]")
    .slice(-12000);
}

function fallbackPlan(log: string) {
  const isWorkflowProblem = /workflow|actions|artifact|gradle|java/i.test(log);
  return {
    summary: "Potrzebna jest ponowna kontrola konfiguracji budowania.",
    diagnosis: isWorkflowProblem
      ? "Log wskazuje na problem w konfiguracji Androida lub GitHub Actions. Najpierw sprawdź workflow i wynik ostatniego przebiegu."
      : "Najpierw sprawdź stan katalogu projektu oraz konfigurację Git przed kolejną próbą.",
    nextOperation: (isWorkflowProblem ? "build_status" : "inspect") as "build_status" | "inspect",
    patchSummary: "Nie utworzono automatycznej zmiany kodu.",
    patch: "",
    requiresApproval: true,
    confidence: 0.45,
    risk: "medium" as const,
    successCondition: "Uzyskaj nowy, zakończony powodzeniem workflow i zweryfikowany artefakt APK.",
  };
}

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  forge: router({
    planRepair: publicProcedure.input(repairInput).mutation(async ({ input }) => {
      const safeLog = redactForModel(input.log);
      try {
        const { data: models } = await listLLMModels();
        const model = models.find((item) => item.id === "gpt-5")?.id ?? models.find((item) => item.id.startsWith("claude-sonnet"))?.id;
        const response = await invokeLLM({
          model,
          messages: [
            {
              role: "system",
              content:
                "Jesteś senior Android/React Native build engineerem oraz agentem IDE. Masz wyłącznie zredagowany kontekst projektu przekazany przez aplikację: log błędu, diagnostykę repozytorium, historię awarii, strukturę i zawartość kilku otwartych buforów edytora oraz żądanie użytkownika. Traktuj kod z edytora jako źródło prawdy dla aktualnych niezapisanych zmian. Nie proś o tokeny, hasła ani klucze. Najpierw ustal najbardziej prawdopodobną przyczynę, potem wybierz najmniejszą bezpieczną zmianę, która prowadzi do weryfikowalnego builda. Zwróć wyłącznie JSON zawierający summary, diagnosis, nextOperation, patchSummary, patch, requiresApproval, confidence (0..1), risk (low/medium/high), successCondition. nextOperation ma należeć do: inspect, publish, run_task, start_build, build_status, download_apk, apply_patch. Jeżeli potrzebujesz lokalnej weryfikacji kodu, wybierz run_task i użyj tylko zadań: check, lint, test, format, build, android:assembleDebug, android:assembleRelease. Nie uruchamiaj arbitralnych poleceń powłoki. Jeśli proponujesz patch, umieść mały ujednolicony diff Git wyłącznie dla plików tekstowych projektu. Nigdy nie modyfikuj sekretów, .env, certyfikatów, kluczy, tokenów, uprawnień, lockfile'i bez konieczności wynikającej bezpośrednio z błędu, ani konfiguracji publikowania. Preferuj najpierw inspect/build_status, gdy dowody są niewystarczające. Jeżeli nie masz pewności, zwróć pusty patch i requiresApproval=true.",
            },
            {
              role: "user",
              content: `Projekt: ${input.projectPath}\nRepozytorium: ${input.repository}\nZakończone etapy: ${input.completedSteps.join(", ") || "brak"}\nZgoda na automatyczny mały diff: ${input.allowAutoPatch ? "tak" : "nie"}\nHistoria skrótów błędów: ${input.failureHistory.join(" | ") || "brak"}\n\nDiagnostyka projektu:\n${redactForModel(input.diagnostics)}\n\nAktualny plik w edytorze:\n${input.currentFile || "brak"}\n\nAktualny kod (fragment):\n${redactForModel(input.currentContent)}\n\nOtwarte bufory IDE (kontekst wieloplikowy):\n${input.openFiles.map((item) => `--- ${item.path} ---\n${redactForModel(item.content)}`).join("\n") || "brak"}\n\nŻądanie użytkownika:\n${redactForModel(input.userRequest)}\n\nZredagowany log błędu:\n${safeLog}`,
            },
          ],
          response_format: { type: "json_object" },
          reasoning: model === "gpt-5" ? { effort: "low" } : undefined,
          maxTokens: 3500,
        });
        const text = response.choices[0]?.message.content;
        if (!text || typeof text !== "string") return fallbackPlan(safeLog);
        const parsed = repairPlan.safeParse(JSON.parse(text));
        if (!parsed.success) return fallbackPlan(safeLog);
        return {
          ...parsed.data,
          requiresApproval: parsed.data.patch ? !input.allowAutoPatch : true,
          confidence: parsed.data.confidence,
          risk: parsed.data.risk,
          successCondition: parsed.data.successCondition,
        };
      } catch {
        return fallbackPlan(safeLog);
      }
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
