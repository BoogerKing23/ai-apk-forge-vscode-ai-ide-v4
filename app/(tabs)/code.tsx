import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { ActionButton, SectionTitle, StatusPill } from "@/components/forge-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useBuildSession } from "@/lib/build-session-context";
import { redactSecrets } from "@/lib/forge-policy";
import { trpc } from "@/lib/trpc";

type TabBuffer = { content: string; saved: string; loading?: boolean };
type Problem = { line?: number; severity: "error" | "warning" | "info"; message: string; source: string };
type SearchHit = { raw: string; path: string; line?: number; text: string };
type AiPlan = { summary: string; diagnosis: string; patch?: string; nextOperation?: string; patchSummary?: string; confidence?: number; risk?: string; successCondition?: string };

const palette = {
  bg: "#07101A", panel: "#0B1624", panel2: "#0E1B2B", border: "#20344A", muted: "#71839A", text: "#DCE8F3", accent: "#39D0FF", green: "#51E2A4", error: "#FF6B7A", warning: "#FFC857",
};

function languageFor(file: string) {
  const ext = file.split(".").pop()?.toLowerCase();
  if (ext === "tsx" || ext === "ts") return "TypeScript";
  if (["jsx", "js", "mjs", "cjs"].includes(ext || "")) return "JavaScript";
  if (["json", "jsonc"].includes(ext || "")) return "JSON";
  if (["kt", "kts"].includes(ext || "")) return "Kotlin";
  if (ext === "java") return "Java";
  if (ext === "xml") return "XML";
  if (["gradle", "properties"].includes(ext || "")) return "Gradle";
  return "Text";
}

function fileIcon(file: string) {
  const ext = file.split(".").pop()?.toLowerCase();
  if (["tsx", "ts"].includes(ext || "")) return "TS";
  if (["js", "jsx", "mjs", "cjs"].includes(ext || "")) return "JS";
  if (["kt", "kts"].includes(ext || "")) return "KT";
  if (ext === "json") return "{}";
  if (["yml", "yaml"].includes(ext || "")) return "Y";
  if (["gradle", "properties"].includes(ext || "")) return "G";
  return "•";
}

function parseProblems(text: string): Problem[] {
  const problems: Problem[] = [];
  for (const raw of text.split("\n")) {
    if (!raw.trim()) continue;
    const line = raw.match(/(?:^|[ :()\[\]])(\d+)(?::\d+)?(?=[ :)\[\]]|$)/);
    if (/error TS\d+|\bERROR\b|BUILD FAILED|FAILURE: Build failed|TypeError|SyntaxError|error:/i.test(raw)) {
      problems.push({ line: line ? Number(line[1]) : undefined, severity: "error", message: raw.trim().slice(0, 240), source: "build" });
    } else if (/warning TS\d+|\bWARN\b|warning:/i.test(raw)) {
      problems.push({ line: line ? Number(line[1]) : undefined, severity: "warning", message: raw.trim().slice(0, 240), source: "build" });
    }
    if (problems.length >= 100) break;
  }
  return problems;
}

function symbolsFor(content: string) {
  return content.split("\n").map((line, index) => {
    const match = line.match(/^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|interface|type|const|let|enum)\s+([A-Za-z_$][\w$]*)/);
    return match ? { line: index + 1, name: match[1], raw: line.trim().slice(0, 100) } : null;
  }).filter(Boolean) as { line: number; name: string; raw: string }[];
}

function parseSearchHit(value: string): SearchHit {
  const match = value.match(/^(.*?):(\d+):(.*)$/);
  return match ? { raw: value, path: match[1], line: Number(match[2]), text: match[3].trim() } : { raw: value, path: value, text: value };
}

function lineStart(content: string, line: number) {
  const lines = content.split("\n");
  let offset = 0;
  for (let i = 1; i < Math.max(1, line) && i <= lines.length; i += 1) offset += lines[i - 1].length + 1;
  return Math.min(offset, content.length);
}


function buildTreeRows(files: string[], collapsed: Record<string, boolean>) {
  const rows: Array<{ kind: "folder" | "file"; path: string; depth: number; name: string }> = [];
  const all = new Set(files);
  const folders = new Set<string>();
  for (const file of files) {
    const parts = file.split("/");
    for (let i = 1; i < parts.length; i += 1) folders.add(parts.slice(0, i).join("/"));
  }
  const entries = [...new Set([...folders, ...files])].sort((a, b) => {
    const af = !all.has(a), bf = !all.has(b);
    if (af !== bf) return af ? -1 : 1;
    return a.localeCompare(b);
  });
  for (const path of entries) {
    const parts = path.split("/");
    const isFolder = !all.has(path);
    const parent = parts.slice(0, -1).join("/");
    if (parent && collapsed[parent]) continue;
    rows.push({ kind: isFolder ? "folder" : "file", path, depth: Math.max(0, parts.length - 1), name: parts.at(-1) || path });
  }
  return rows;
}

function findMatches(content: string, query: string) {
  const value = query.toLowerCase();
  if (!value) return [];
  const result: Array<{ start: number; end: number }> = [];
  let from = 0;
  while (result.length < 200) {
    const found = content.toLowerCase().indexOf(value, from);
    if (found < 0) break;
    result.push({ start: found, end: found + query.length });
    from = found + Math.max(1, query.length);
  }
  return result;
}

function FileRow({ path, selected, dirty, onPress }: { path: string; selected: boolean; dirty: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 7, backgroundColor: selected ? "#15304A" : pressed ? "#102236" : "transparent" })}>
    <View className="flex-row items-center gap-2"><Text className="w-5 text-center font-mono text-[8px] text-primary">{fileIcon(path)}</Text><Text numberOfLines={1} className={`flex-1 font-mono text-[11px] ${selected ? "font-bold text-primary" : "text-foreground"}`}>{path.split("/").pop()}</Text>{dirty ? <Text className="text-[10px] text-primary">●</Text> : null}</View>
    <Text numberOfLines={1} className="mt-0.5 pl-7 font-mono text-[8px] text-muted">{path.includes("/") ? `${path.slice(0, Math.max(0, path.lastIndexOf("/")))}/` : "./"}</Text>
  </Pressable>;
}

export default function CodeScreen() {
  const { session, runOperation, appendNote, setEditorContext } = useBuildSession();
  const editorRef = useRef<TextInput>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [buffers, setBuffers] = useState<Record<string, TabBuffer>>({});
  const [history, setHistory] = useState<Record<string, string[]>>({});
  const [historyIndex, setHistoryIndex] = useState<Record<string, number>>({});
  const [treeFilter, setTreeFilter] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [activePanel, setActivePanel] = useState<"problems" | "output" | "source" | "search" | "diff" | null>(null);
  const [taskOutput, setTaskOutput] = useState("");
  const [taskRunning, setTaskRunning] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  const [showGoto, setShowGoto] = useState(false);
  const [gotoLine, setGotoLine] = useState("");
  const [showAi, setShowAi] = useState(false);
  const [showPatch, setShowPatch] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [showFind, setShowFind] = useState(false);
  const [activeLine, setActiveLine] = useState(1);
  const [activeColumn, setActiveColumn] = useState(1);
  const [aiLoopProgress, setAiLoopProgress] = useState("");
  const [aiLoopRunning, setAiLoopRunning] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiPlan, setAiPlan] = useState<AiPlan | null>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [gitDiff, setGitDiff] = useState("");
  const [gitStatus, setGitStatus] = useState<string[]>([]);
  const repair = trpc.forge.planRepair.useMutation();

  const current = selectedFile ? buffers[selectedFile] : undefined;
  const content = current?.content || "";
  const changed = Boolean(current && current.content !== current.saved);
  const lines = useMemo(() => content.split("\n"), [content]);
  const lineNumbers = useMemo(() => Array.from({ length: Math.max(lines.length, 1) }, (_, index) => String(index + 1)).join("\n"), [lines.length]);
  const symbols = useMemo(() => symbolsFor(content), [content]);
  const problems = useMemo(() => parseProblems(`${taskOutput}\n${session?.logs.slice(-20).join("\n") || ""}`), [session?.logs, taskOutput]);
  const openTabs = Object.keys(buffers);
  const filteredFilesBase = useMemo(() => {
    const q = treeFilter.trim().toLowerCase();
    return q ? files.filter((file) => file.toLowerCase().includes(q)) : files;
  }, [files, treeFilter]);
  const filteredFiles = filteredFilesBase;
  const treeRows = useMemo(() => buildTreeRows(filteredFilesBase, collapsedFolders), [filteredFilesBase, collapsedFolders]);
  const selectedMatches = useMemo(() => findMatches(content, findQuery), [content, findQuery]);
  const wordCount = useMemo(() => content.trim() ? content.trim().split(/\s+/).length : 0, [content]);

  const loadFiles = useCallback(async () => {
    if (!session) return;
    try {
      const result = await runOperation("list_files");
      setFiles(result.files || []);
      if (!selectedFile && result.files?.length) setSelectedFile(result.files[0]);
    } catch {}
  }, [runOperation, selectedFile, session]);

  const openFile = useCallback(async (file: string, targetLine?: number) => {
    if (!session) return;
    setSelectedFile(file);
    const existing = buffers[file];
    if (existing) {
      setEditorContext(file, existing.content);
      if (targetLine) requestAnimationFrame(() => editorRef.current?.setSelection({ start: lineStart(existing.content, targetLine), end: lineStart(existing.content, targetLine) }));
      return;
    }
    setBuffers((prev) => ({ ...prev, [file]: { content: "", saved: "", loading: true } }));
    try {
      const result = await runOperation("read_file", undefined, undefined, { filePath: file });
      const next = result.content || "";
      setBuffers((prev) => ({ ...prev, [file]: { content: next, saved: next } }));
      setHistory((prev) => ({ ...prev, [file]: [next] }));
      setHistoryIndex((prev) => ({ ...prev, [file]: 0 }));
      setEditorContext(file, next);
      if (targetLine) requestAnimationFrame(() => editorRef.current?.setSelection({ start: lineStart(next, targetLine), end: lineStart(next, targetLine) }));
    } catch { setBuffers((prev) => { const n = { ...prev }; delete n[file]; return n; }); }
  }, [buffers, runOperation, session, setEditorContext]);

  useEffect(() => { void loadFiles(); }, [loadFiles]);
  useEffect(() => { if (selectedFile) setEditorContext(selectedFile, content); }, [content, selectedFile, setEditorContext]);

  const updateContent = (next: string) => {
    if (!selectedFile) return;
    setBuffers((prev) => ({ ...prev, [selectedFile]: { content: next, saved: prev[selectedFile]?.saved || "" } }));
    setHistory((prev) => ({ ...prev, [selectedFile]: [...(prev[selectedFile] || [content]), next].slice(-50) }));
    setHistoryIndex((prev) => ({ ...prev, [selectedFile]: Math.min((prev[selectedFile] ?? 0) + 1, 49) }));
  };

  const saveFile = async () => {
    if (!session || !selectedFile || !current || !changed) return;
    try {
      await runOperation("write_file", undefined, undefined, { filePath: selectedFile, content, confirmed: true });
      setBuffers((prev) => ({ ...prev, [selectedFile]: { content, saved: content } }));
      appendNote(`Edytor: zapisano ${selectedFile}. Stary wynik buildu został unieważniony.`);
    } catch {}
  };

  const undo = () => {
    if (!selectedFile) return;
    const entries = history[selectedFile] || [];
    const index = historyIndex[selectedFile] ?? entries.length - 1;
    const nextIndex = Math.max(0, index - 1);
    const next = entries[nextIndex];
    if (next == null) return;
    setHistoryIndex((prev) => ({ ...prev, [selectedFile]: nextIndex }));
    setBuffers((prev) => ({ ...prev, [selectedFile]: { content: next, saved: prev[selectedFile]?.saved || "" } }));
  };

  const redo = () => {
    if (!selectedFile) return;
    const entries = history[selectedFile] || [];
    const index = historyIndex[selectedFile] ?? entries.length - 1;
    const nextIndex = Math.min(entries.length - 1, index + 1);
    const next = entries[nextIndex];
    if (next == null) return;
    setHistoryIndex((prev) => ({ ...prev, [selectedFile]: nextIndex }));
    setBuffers((prev) => ({ ...prev, [selectedFile]: { content: next, saved: prev[selectedFile]?.saved || "" } }));
  };

  const closeTab = (file: string) => {
    const tab = buffers[file];
    if (tab?.content !== tab?.saved) {
      Alert.alert("Niezapisane zmiany", `${file} ma niezapisane zmiany.`, [
        { text: "Anuluj", style: "cancel" },
        { text: "Zamknij", style: "destructive", onPress: () => closeTabNow(file) },
      ]);
      return;
    }
    closeTabNow(file);
  };

  const closeTabNow = (file: string) => {
    setBuffers((prev) => { const next = { ...prev }; delete next[file]; return next; });
    const remaining = openTabs.filter((item) => item !== file);
    if (selectedFile === file) setSelectedFile(remaining[0] || "");
  };

  const createFile = async () => {
    const path = newFilePath.trim().replaceAll("\\", "/");
    if (!path || path.includes("..") || path.startsWith("/") || !/\.(tsx?|jsx?|mjs|cjs|json|jsonc|md|mdx|yml|yaml|xml|gradle|kts|properties|toml|css|scss|html|java|kt|swift|py|sh|txt)$/i.test(path)) {
      Alert.alert("Nowy plik", "Podaj względną ścieżkę tekstowego pliku projektu.");
      return;
    }
    try {
      await runOperation("write_file", undefined, undefined, { filePath: path, content: "", confirmed: true });
      setNewFilePath(""); setShowNewFile(false); await loadFiles(); await openFile(path);
      appendNote(`Edytor: utworzono ${path}.`);
    } catch (error) { Alert.alert("Nowy plik", error instanceof Error ? error.message : "Nie udało się utworzyć pliku."); }
  };

  const search = async () => {
    const safe = redactSecrets(query.trim());
    if (safe.length < 2) return;
    try {
      const result = await runOperation("search_files", undefined, undefined, { query: safe });
      setSearchResults((result.matches || []).map(parseSearchHit));
      setActivePanel("search");
    } catch {}
  };

  const refreshGit = async () => {
    try {
      const [status, diff] = await Promise.all([runOperation("git_status"), runOperation("git_diff")]);
      setGitStatus(status.filesStatus || []);
      setGitDiff(diff.diff || diff.output || "");
      setActivePanel("diff");
    } catch {}
  };

  const runTask = async (task: string) => {
    setTaskRunning(true);
    try {
      const result = await runOperation("run_task", undefined, undefined, { task });
      setTaskOutput(result.output);
      setActivePanel("output");
      appendNote(`Termux • ${task}: ${result.ok ? "OK" : "BŁĄD"}`);
    } catch (error) {
      setTaskOutput(error instanceof Error ? error.message : "Zadanie zakończyło się błędem.");
      setActivePanel("output");
    } finally { setTaskRunning(false); setShowPalette(false); }
  };

  const replaceCurrentMatch = async () => {
    if (!selectedFile || !findQuery || !selectedMatches.length) return;
    const replacement = replaceQuery;
    let next = content;
    for (let i = selectedMatches.length - 1; i >= 0; i -= 1) {
      const match = selectedMatches[i];
      next = next.slice(0, match.start) + replacement + next.slice(match.end);
    }
    updateContent(next);
    setTaskOutput(`Zastąpiono ${selectedMatches.length} wystąpień w ${selectedFile}.`);
    setActivePanel("output");
  };

  const jumpToLine = (line: number) => {
    if (!selectedFile || !content) return;
    const target = Math.max(1, Math.min(line, lines.length));
    editorRef.current?.focus();
    const offset = lineStart(content, target);
    editorRef.current?.setSelection({ start: offset, end: offset });
    setShowGoto(false);
  };

  const aiAskAboutCode = async () => {
    if (!session || !selectedFile || aiBusy) return;
    setAiBusy(true);
    try {
      const selectedText = content.slice(selection.start, selection.end);
      const inspected = await runOperation("inspect").catch(() => null);
      const diff = await runOperation("git_diff").catch(() => null);
      const plan = await repair.mutateAsync({
        projectPath: session.projectPath,
        repository: session.repository,
        log: redactSecrets(taskOutput || "Brak ostatniego outputu."),
        diagnostics: redactSecrets(`${inspected?.output || session.diagnostics || ""}\n\nGIT DIFF:\n${diff?.output || "brak"}`),
        failureHistory: session.failureHistory || [],
        completedSteps: session.steps.filter((step) => step.status === "success").map((step) => step.id),
        allowAutoPatch: false,
        currentFile: selectedFile,
        currentContent: redactSecrets(content),
        openFiles: openTabs.slice(0, 8).map((path) => ({ path, content: redactSecrets(buffers[path]?.content || "") })),
        userRequest: redactSecrets(aiPrompt.trim() || `Jesteś wewnątrz IDE. Przeanalizuj bieżący plik${selectedText ? " i zaznaczenie" : ""}. Wskaż konkretny problem, minimalny bezpieczny diff i sposób weryfikacji. Zaznaczenie:\n${selectedText}`),
      });
      setAiPlan(plan); setActivePanel("problems"); setShowAi(false); appendNote(`AI IDE: ${plan.summary}`);
    } catch (error) { Alert.alert("AI", error instanceof Error ? error.message : "Analiza AI nie powiodła się."); }
    finally { setAiBusy(false); }
  };

  const applyAiPatch = async () => {
    if (!aiPlan?.patch || aiBusy) return;
    Alert.alert("Zastosować poprawkę AI?", "Most wykona git apply --check przed zmianą plików.", [{ text: "Anuluj", style: "cancel" }, { text: "Zastosuj", style: "destructive", onPress: async () => {
      setAiBusy(true);
      try {
        const result = await runOperation("apply_patch", aiPlan.patch);
        setTaskOutput(result.output); setAiPlan(null); setBuffers({}); await loadFiles(); setActivePanel("output"); appendNote("AI: zastosowano zatwierdzony diff. Uruchom check.");
      } catch (error) { setTaskOutput(error instanceof Error ? error.message : "Nie udało się zastosować diffu."); setActivePanel("output"); }
      finally { setAiBusy(false); }
    } }]);
  };

  const aiBuildAndRepair = async (mode: "guided" | "auto" = "guided") => {
    if (!session || aiBusy || aiLoopRunning) return;
    setAiBusy(true);
    setAiLoopRunning(mode === "auto");
    setAiLoopProgress(mode === "auto" ? "Przygotowanie lokalnego checka…" : "Walidacja projektu…");
    try {
      if (changed) await saveFile();
      let lastEvidence = "";
      for (let iteration = 1; iteration <= (mode === "auto" ? 3 : 1); iteration += 1) {
        setAiLoopProgress(`${mode === "auto" ? `Auto-Fix ${iteration}/3` : "AI Build"}: lokalny check…`);
        const check = await runOperation("run_task", undefined, undefined, { task: "check" }).catch((error) => ({ ok: false, output: error instanceof Error ? error.message : "TypeScript check nie powiódł się." }));
        setTaskOutput(check.output); setActivePanel("output");
        lastEvidence += `LOCAL CHECK #${iteration}:\n${check.output}\n\n`;
        if (!check.ok) {
          const plan = await repair.mutateAsync({ projectPath: session.projectPath, repository: session.repository, log: redactSecrets(check.output), diagnostics: redactSecrets(`${session.diagnostics || ""}\n${lastEvidence}`), failureHistory: session.failureHistory || [], completedSteps: [], allowAutoPatch: mode === "auto", currentFile: selectedFile, currentContent: redactSecrets(content), openFiles: openTabs.slice(0, 8).map((path) => ({ path, content: redactSecrets(buffers[path]?.content || "") })), userRequest: "Napraw lokalny check. Zwróć minimalny bezpieczny diff i konkretny warunek weryfikacji." });
          setAiPlan(plan); setActivePanel("problems");
          if (mode !== "auto" || !plan.patch || plan.risk !== "low") {
            appendNote(`AI: zatrzymano pętlę po diagnostyce (${plan.risk}).`);
            return;
          }
          setAiLoopProgress(`Auto-Fix ${iteration}/3: zastosowanie niskiego ryzyka patcha…`);
          await runOperation("apply_patch", plan.patch);
          setAiPlan(plan); setBuffers({}); await loadFiles(); if (selectedFile) await openFile(selectedFile);
          continue;
        }
        setAiLoopProgress(`${mode === "auto" ? `Auto-Fix ${iteration}/3` : "AI Build"}: publikacja i GitHub Actions…`);
        const published = await runOperation("publish").catch((error) => ({ ok: false, output: error instanceof Error ? error.message : "Publikacja nie powiodła się." }));
        lastEvidence += `PUBLISH:\n${published.output}\n\n`; if (!published.ok) throw new Error(published.output);
        const started = await runOperation("start_build").catch((error) => ({ ok: false, output: error instanceof Error ? error.message : "Nie udało się uruchomić workflow." }));
        lastEvidence += `START BUILD:\n${started.output}\n\n`; if (!started.ok || !started.runId) throw new Error(started.output);
        let finalStatus = ""; let success = false;
        for (let attempt = 0; attempt < 16; attempt += 1) {
          await new Promise((r) => setTimeout(r, 2200));
          const status = await runOperation("build_status").catch((error) => ({ ok: false, output: error instanceof Error ? error.message : "Brak statusu workflow." }));
          finalStatus = status.output; setTaskOutput(finalStatus); lastEvidence += `BUILD POLL ${attempt + 1}:\n${status.output}\n\n`;
          if (status.completed) { success = status.success === true; break; }
        }
        if (success) {
          setAiLoopProgress("Gotowe: build zakończony sukcesem.");
          appendNote(mode === "auto" ? `AI Auto-Fix: sukces po ${iteration} iteracji.` : "AI Build Engineer: check → publish → GitHub Actions zakończone sukcesem.");
          Alert.alert("Build OK", mode === "auto" ? `Build zakończony powodzeniem po ${iteration} iteracji.` : "Workflow Android zakończył się powodzeniem.");
          return;
        }
        const plan = await repair.mutateAsync({ projectPath: session.projectPath, repository: session.repository, log: redactSecrets(finalStatus || lastEvidence), diagnostics: redactSecrets(`${session.diagnostics || ""}\n${lastEvidence}`), failureHistory: session.failureHistory || [], completedSteps: [], allowAutoPatch: mode === "auto", currentFile: selectedFile, currentContent: redactSecrets(content), openFiles: openTabs.slice(0, 8).map((path) => ({ path, content: redactSecrets(buffers[path]?.content || "") })), userRequest: "Android build nie przeszedł. Zdiagnozuj root cause, zaproponuj minimalny diff i następny krok w pętli IDE → check → build." });
        setAiPlan(plan); setActivePanel("problems");
        if (mode !== "auto" || !plan.patch || plan.risk !== "low") {
          appendNote(`AI Build Engineer: ${plan.summary}`);
          return;
        }
        setAiLoopProgress(`Auto-Fix ${iteration}/3: poprawka niskiego ryzyka → ponowny check…`);
        await runOperation("apply_patch", plan.patch);
        setBuffers({}); await loadFiles(); if (selectedFile) await openFile(selectedFile);
      }
      Alert.alert("Auto-Fix zatrzymany", "Osiągnięto limit 3 iteracji. Sprawdź panel Problems i zatwierdź kolejną zmianę ręcznie.");
    } catch (error) {
      setTaskOutput(error instanceof Error ? error.message : "AI Build zakończył się błędem."); setActivePanel("output"); appendNote("AI Build: pętla przerwana przez błąd wykonania.");
    } finally { setAiBusy(false); setAiLoopRunning(false); setAiLoopProgress(""); }
  };

  const paletteItems: Array<[string, () => void]> = [
    ["Zapisz plik", () => { void saveFile(); }],
    ["Cofnij", undo], ["Ponów", redo],
    ["Znajdź / zamień", () => setShowFind(true)],
    ["Przejdź do linii…", () => setShowGoto(true)],
    ["Pokaż Outline", () => setShowSymbols(true)],
    ["Sprawdź TypeScript", () => { void runTask("check"); }], ["Lint", () => { void runTask("lint"); }], ["Testy", () => { void runTask("test"); }], ["Formatuj projekt", () => { void runTask("format"); }], ["Build serwera", () => { void runTask("build"); }], ["Android debug", () => { void runTask("android:assembleDebug"); }], ["Android release", () => { void runTask("android:assembleRelease"); }], ["Odśwież Git + diff", () => { void refreshGit(); }],
    ["AI: Quick Fix / analiza", () => setShowAi(true)], ["AI: Build Engineer", () => { void aiBuildAndRepair("guided"); }], ["AI: Auto-Fix Build (max 3)", () => { void aiBuildAndRepair("auto"); }], ["AI: zastosuj przygotowany diff", () => { void applyAiPatch(); }],
  ];

  if (!session) return <ScreenContainer className="p-5"><SectionTitle eyebrow="Kod" title="Otwórz projekt" detail="Najpierw utwórz sesję z katalogiem projektu w Termuxie." /></ScreenContainer>;

  return <ScreenContainer className="bg-[#07101A]" edges={["top", "left", "right"]}>
    <View className="flex-1">
      <View className="border-b border-[#20344A] bg-[#0B1624] px-3 py-2">
        <View className="flex-row items-center gap-2"><Text className="text-[10px] font-bold tracking-[1.5px] text-primary">AI APK FORGE • IDE CORE</Text><View className="flex-1" /><StatusPill status={changed ? "waiting" : "success"} label={changed ? "DIRTY" : "SYNC"} /></View>
        <Text numberOfLines={1} className="mt-1 text-sm font-semibold text-foreground">{session.repository}</Text>
        <View className="mt-2 flex-row gap-2"><Pressable onPress={() => setShowPalette(true)} className="rounded-lg border border-[#2B4862] bg-[#0A1320] px-3 py-2"><Text className="font-mono text-[10px] text-foreground">⌘P • Command Palette</Text></Pressable><View className="flex-1 flex-row gap-2"><Pressable onPress={() => void aiBuildAndRepair("guided")} disabled={aiBusy} className="flex-1 rounded-lg bg-primary px-3 py-2"><Text className="text-center text-[10px] font-bold text-background">{aiBusy ? "AI • PRACUJE…" : "AI BUILD"}</Text></Pressable><Pressable onPress={() => void aiBuildAndRepair("auto")} disabled={aiBusy} className="rounded-lg border border-[#36D6A6] bg-[#0E2A28] px-3 py-2"><Text className="text-center text-[9px] font-bold text-[#66F0C4]">AUTO-FIX</Text></Pressable></View></View>
        <View className="mt-2 flex-row gap-2"><TextInput value={treeFilter} onChangeText={setTreeFilter} placeholder="Explorer" placeholderTextColor={palette.muted} autoCapitalize="none" autoCorrect={false} className="flex-1 rounded-lg border border-[#27415B] bg-[#0A1320] px-3 py-2 font-mono text-[10px] text-foreground" /><TextInput value={query} onChangeText={setQuery} onSubmitEditing={search} placeholder="Search files…" placeholderTextColor={palette.muted} autoCapitalize="none" autoCorrect={false} className="flex-1 rounded-lg border border-[#27415B] bg-[#0A1320] px-3 py-2 font-mono text-[10px] text-foreground" /><Pressable onPress={() => void loadFiles()} className="justify-center rounded-lg border border-[#27415B] bg-[#0D1A29] px-3"><Text className="text-primary">↻</Text></Pressable></View>
      </View>

      {aiLoopProgress ? <View className="border-b border-[#24485B] bg-[#0A202D] px-3 py-2"><Text className="font-mono text-[8px] text-primary">{aiLoopProgress}</Text></View> : null}{openTabs.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-h-10 border-b border-[#20344A] bg-[#09131F]"><View className="flex-row">{openTabs.map((tab) => <View key={tab} className={`min-w-40 max-w-60 flex-row items-center border-r border-[#20344A] ${tab === selectedFile ? "bg-[#101D2A]" : "bg-[#0B1725]"}`}><Pressable onPress={() => void openFile(tab)} className="flex-1 flex-row items-center px-3 py-2"><Text className="mr-2 font-mono text-[8px] text-primary">{fileIcon(tab)}</Text><Text numberOfLines={1} className="flex-1 font-mono text-[10px] text-foreground">{buffers[tab].content !== buffers[tab].saved ? "● " : ""}{tab.split("/").pop()}</Text></Pressable><Pressable onPress={() => closeTab(tab)} className="px-3 py-2"><Text className="text-[11px] text-muted">×</Text></Pressable></View>)}</View></ScrollView>}

      <View className="flex-1 flex-row">
        <View className="w-[32%] max-w-[225px] border-r border-[#20344A] bg-[#09131F]"><View className="flex-row items-center border-b border-[#20344A] px-3 py-2"><Text className="flex-1 text-[9px] font-bold tracking-wide text-muted">EXPLORER</Text><Pressable onPress={() => setShowNewFile(true)}><Text className="mr-2 text-[13px] text-primary">＋</Text></Pressable><Text className="font-mono text-[8px] text-muted">{filteredFiles.length}</Text></View><FlatList data={treeRows} keyExtractor={(item) => `${item.kind}:${item.path}`} renderItem={({ item }) => item.kind === "folder" ? <Pressable onPress={() => setCollapsedFolders((prev) => ({ ...prev, [item.path]: !prev[item.path] }))} className="flex-row items-center px-3 py-2"><Text className="mr-1 text-[9px] text-primary">{collapsedFolders[item.path] ? "›" : "⌄"}</Text><Text className="font-mono text-[9px] text-foreground">{item.name}</Text></Pressable> : <View style={{ paddingLeft: 8 + item.depth * 10 }}><FileRow path={item.path} selected={item.path === selectedFile} dirty={buffers[item.path] ? buffers[item.path].content !== buffers[item.path].saved : false} onPress={() => void openFile(item.path)} /></View>} /></View>
        <View className="flex-1 bg-[#07101A]">
          <View className="flex-row items-center border-b border-[#20344A] bg-[#0B1725] px-3 py-2"><Text numberOfLines={1} className="max-w-[58%] font-mono text-[9px] text-muted">{selectedFile || "Wybierz plik"}</Text><View className="flex-1" /><Pressable onPress={() => setShowGoto(true)}><Text className="mr-3 text-[9px] text-primary">Go to Line</Text></Pressable><Pressable onPress={() => setShowSymbols((v) => !v)}><Text className="mr-3 text-[9px] text-primary">{showSymbols ? "Hide Outline" : "Outline"}</Text></Pressable><Pressable onPress={() => setShowAi(true)}><Text className="text-[9px] font-bold text-primary">AI ✦</Text></Pressable></View>
          {showSymbols ? <ScrollView className="max-h-24 border-b border-[#20344A] bg-[#09131F]"><View className="p-2">{symbols.length ? symbols.slice(0, 60).map((s) => <Pressable key={`${s.name}-${s.line}`} onPress={() => jumpToLine(s.line)} className="flex-row items-center py-1"><Text className="w-10 font-mono text-[8px] text-primary">{s.line}</Text><Text numberOfLines={1} className="flex-1 font-mono text-[9px] text-foreground">{s.name}</Text></Pressable>) : <Text className="text-[9px] text-muted">Brak wykrytych symboli.</Text>}</View></ScrollView> : null}
          <View className="flex-row items-center border-b border-[#20344A] bg-[#08131F] px-3 py-1"><Text numberOfLines={1} className="flex-1 font-mono text-[8px] text-muted">WORKSPACE / {selectedFile || "NO FILE"}</Text><Text className="font-mono text-[8px] text-primary">{changed ? "● MODIFIED" : "✓ CLEAN"}</Text></View><View className="flex-row items-center border-b border-[#20344A] bg-[#08131F] px-2 py-1"><Pressable onPress={undo} className="px-2 py-1"><Text className="text-xs text-muted">↶</Text></Pressable><Pressable onPress={redo} className="px-2 py-1"><Text className="text-xs text-muted">↷</Text></Pressable><Text className="mx-2 text-[8px] text-muted">{changed ? "UNSAVED CHANGES" : "SAVED"}</Text><View className="flex-1" /><Text className="font-mono text-[8px] text-muted">{languageFor(selectedFile)} • UTF-8 • LF</Text></View>
          {showFind ? <View className="flex-row items-center gap-2 border-b border-[#20344A] bg-[#0A1724] px-2 py-2"><TextInput value={findQuery} onChangeText={setFindQuery} autoFocus placeholder="Find" placeholderTextColor="#71839A" className="flex-1 rounded-md border border-[#27415B] bg-[#08131F] px-2 py-1 font-mono text-[9px] text-foreground" /><TextInput value={replaceQuery} onChangeText={setReplaceQuery} placeholder="Replace" placeholderTextColor="#71839A" className="flex-1 rounded-md border border-[#27415B] bg-[#08131F] px-2 py-1 font-mono text-[9px] text-foreground" /><Text className="font-mono text-[8px] text-muted">{selectedMatches.length} matches</Text><Pressable onPress={() => void replaceCurrentMatch()}><Text className="text-[9px] font-bold text-primary">ALL</Text></Pressable><Pressable onPress={() => setShowFind(false)}><Text className="text-[10px] text-muted">×</Text></Pressable></View> : null}<ScrollView horizontal keyboardShouldPersistTaps="handled"><View className="flex-row py-2"><View className="w-12 items-end pr-3"><Text selectable className="font-mono text-[10px] leading-[18px] text-[#45627A]">{lineNumbers}</Text></View><TextInput ref={editorRef} value={content} onChangeText={updateContent} editable={Boolean(selectedFile) && !current?.loading} multiline scrollEnabled={false} textAlignVertical="top" onSelectionChange={(event) => { const next = event.nativeEvent.selection; setSelection(next); const before = content.slice(0, next.start); const row = before.split("\n"); setActiveLine(row.length); setActiveColumn((row.at(-1)?.length || 0) + 1); }} autoCapitalize="none" autoCorrect={false} spellCheck={false} placeholder="Wybierz plik z Explorera" placeholderTextColor="#50667A" className="min-w-[900px] flex-1 bg-transparent px-0 py-0 font-mono text-[10px] leading-[18px] text-[#D8E5F2]" style={{ minHeight: 640 }} /></View><View className="w-20 border-l border-[#20344A] bg-[#09131F] px-1"><Text className="mb-1 text-[7px] font-bold text-muted">MINIMAP</Text><ScrollView scrollEnabled={false} style={{ maxHeight: 640 }}><Text selectable={false} numberOfLines={90} className="font-mono text-[5px] leading-[6px] text-[#4A647B]">{lines.map((line) => line.replace(/\t/g, "  ").slice(0, 34)).join("\n") || " "}</Text></ScrollView></View></View></ScrollView>
        </View>
      </View>

      <View className="border-t border-[#20344A] bg-[#0B1624]"><View className="flex-row px-2 pt-1">{(["problems", "output", "search", "diff", "source"] as const).map((panel) => <Pressable key={panel} onPress={() => setActivePanel(activePanel === panel ? null : panel)} className={`rounded-t px-2 py-2 ${activePanel === panel ? "bg-[#142334]" : ""}`}><Text className="text-[8px] font-bold uppercase tracking-wide text-muted">{panel === "problems" ? `Problems ${problems.length}` : panel === "output" ? "Output" : panel === "search" ? `Search ${searchResults.length}` : panel === "diff" ? `Git Diff ${gitStatus.length}` : "Source Control"}</Text></Pressable>)}</View>
        {activePanel ? <View className="max-h-52 border-t border-[#20344A] bg-[#09131F] p-3">
          {activePanel === "problems" ? <ScrollView>{aiPlan ? <View className="mb-3 rounded-xl border border-[#2F7DA2] bg-[#0C1D2C] p-3"><View className="flex-row items-center"><Text className="text-[9px] font-bold tracking-wide text-primary">AI DIAGNOSTICS</Text><View className="flex-1" /><Text className="text-[8px] text-muted">{aiPlan.risk || "review"} • {aiPlan.confidence ? `${Math.round(aiPlan.confidence * 100)}%` : "—"}</Text></View><Text className="mt-2 text-[11px] font-semibold text-foreground">{aiPlan.summary}</Text><Text selectable className="mt-2 text-[9px] leading-4 text-muted">{aiPlan.diagnosis}</Text>{aiPlan.successCondition ? <Text className="mt-2 text-[8px] text-primary">Weryfikacja: {aiPlan.successCondition}</Text> : null}{aiPlan.patch ? <Pressable onPress={() => setShowPatch(true)} className="mt-3 rounded-lg bg-primary px-3 py-2"><Text className="text-center text-[9px] font-bold text-background">REVIEW & APPLY DIFF</Text></Pressable> : null}</View> : null}{problems.map((problem, i) => <Pressable key={i} onPress={() => problem.line && jumpToLine(problem.line)} className="mb-1 flex-row"><Text className={`mr-2 font-mono text-[10px] ${problem.severity === "error" ? "text-red-400" : "text-yellow-300"}`}>{problem.severity === "error" ? "✕" : "⚠"}</Text><Text className="flex-1 font-mono text-[9px] leading-4 text-foreground">{problem.line ? `Ln ${problem.line}: ` : ""}{problem.message}</Text></Pressable>)}{!problems.length && !aiPlan ? <Text className="text-xs text-muted">Brak wykrytych problemów. Kliknięcie problemu prowadzi do linii źródłowej.</Text> : null}</ScrollView>
          : activePanel === "output" ? <ScrollView><Text selectable className="font-mono text-[9px] leading-4 text-foreground">{taskOutput || "Brak outputu."}</Text></ScrollView>
          : activePanel === "search" ? <ScrollView>{searchResults.length ? searchResults.map((hit, i) => <Pressable key={i} onPress={() => void openFile(hit.path, hit.line)} className="mb-2 rounded-md px-2 py-1"><Text className="font-mono text-[9px] text-primary">{hit.path}{hit.line ? `:${hit.line}` : ""}</Text><Text numberOfLines={2} className="font-mono text-[9px] text-foreground">{hit.text}</Text></Pressable>) : <Text className="text-xs text-muted">Brak wyników.</Text>}</ScrollView>
          : activePanel === "diff" ? <ScrollView><Text selectable className="font-mono text-[8px] leading-3 text-foreground">{gitDiff || "Brak lokalnego diffu. Odśwież Git, aby pobrać aktualny stan."}</Text></ScrollView>
          : <ScrollView><Text selectable className="font-mono text-[9px] leading-4 text-foreground">Branch: {session.lastConclusion || "—"}{"\n"}Run ID: {session.runId || "—"}{"\n"}Zmiany workspace: {gitStatus.join(" | ") || "brak"}</Text></ScrollView>}
        </View> : null}
        <View className="flex-row items-center justify-between gap-3 px-3 py-2"><Text className="text-[9px] text-muted">{selectedFile ? `${languageFor(selectedFile)} • Ln ${activeLine}, Col ${activeColumn} • ${lines.length} lines • ${wordCount} words` : "No editor"}</Text><View className="flex-row gap-2"><ActionButton label="Save" onPress={saveFile} loading={taskRunning && false} disabled={!selectedFile || !changed} /><ActionButton label="Git" onPress={() => void refreshGit()} tone="secondary" /><ActionButton label="Terminal" onPress={() => setShowPalette(true)} tone="secondary" /></View></View>
      </View>
    </View>

    <Modal visible={showNewFile} transparent animationType="fade" onRequestClose={() => setShowNewFile(false)}><Pressable onPress={() => setShowNewFile(false)} className="flex-1 justify-center bg-black/60 px-5"><Pressable onPress={() => {}} className="rounded-2xl border border-[#2A455F] bg-[#0B1624] p-4"><Text className="text-[10px] font-bold text-primary">NEW FILE</Text><TextInput value={newFilePath} onChangeText={setNewFilePath} autoCapitalize="none" autoCorrect={false} placeholder="src/components/NewThing.tsx" placeholderTextColor="#71839A" className="mt-3 rounded-lg border border-[#27415B] bg-[#08131F] px-3 py-3 font-mono text-sm text-foreground" /><View className="mt-3 flex-row gap-2"><ActionButton label="Anuluj" tone="secondary" onPress={() => setShowNewFile(false)} /><View className="flex-1"><ActionButton label="Utwórz" onPress={() => void createFile()} /></View></View></Pressable></Pressable></Modal>

    <Modal visible={showPatch} transparent animationType="fade" onRequestClose={() => setShowPatch(false)}><Pressable onPress={() => setShowPatch(false)} className="flex-1 justify-end bg-black/70"><Pressable onPress={() => {}} className="max-h-[82%] rounded-t-3xl border border-[#2A455F] bg-[#0B1624] p-4"><View className="flex-row items-center"><Text className="text-[10px] font-bold tracking-wide text-primary">AI PATCH REVIEW</Text><View className="flex-1" /><Text className="text-[8px] text-muted">{aiPlan?.risk || "review"}</Text></View><Text className="mt-2 text-[11px] font-semibold text-foreground">{aiPlan?.patchSummary || "Minimalna poprawka wygenerowana przez AI."}</Text><ScrollView className="mt-3 rounded-xl border border-[#20344A] bg-[#06101A] p-3"><Text selectable className="font-mono text-[8px] leading-4 text-foreground">{aiPlan?.patch || "Brak diffu."}</Text></ScrollView><View className="mt-3 flex-row gap-2"><ActionButton label="Odrzuć" tone="secondary" onPress={() => setShowPatch(false)} /><View className="flex-1"><ActionButton label="Zastosuj po git apply --check" loading={aiBusy} onPress={() => { setShowPatch(false); void applyAiPatch(); }} /></View></View></Pressable></Pressable></Modal>

    <Modal visible={showAi} transparent animationType="fade" onRequestClose={() => setShowAi(false)}><Pressable onPress={() => setShowAi(false)} className="flex-1 justify-end bg-black/60"><Pressable onPress={() => {}} className="rounded-t-3xl border border-[#2A455F] bg-[#0B1624] p-4"><Text className="text-[9px] font-bold tracking-[1.4px] text-primary">AI QUICK FIX • CONTEXT AWARE</Text><Text className="mt-1 text-[12px] text-foreground">AI dostaje bieżący plik, zaznaczenie, diagnostykę, Git diff i wynik Termuxa.</Text><TextInput value={aiPrompt} onChangeText={setAiPrompt} multiline placeholder="Np. napraw ten błąd bez zmiany API komponentu…" placeholderTextColor="#71839A" className="mt-3 min-h-24 rounded-xl border border-[#27415B] bg-[#08131F] px-3 py-3 font-mono text-[10px] text-foreground" /><View className="mt-3 flex-row gap-2"><ActionButton label="Anuluj" tone="secondary" onPress={() => setShowAi(false)} /><View className="flex-1"><ActionButton label={aiBusy ? "AI analizuje…" : "Uruchom analizę"} loading={aiBusy} onPress={() => void aiAskAboutCode()} /></View></View></Pressable></Pressable></Modal>

    <Modal visible={showGoto} transparent animationType="fade" onRequestClose={() => setShowGoto(false)}><Pressable onPress={() => setShowGoto(false)} className="flex-1 justify-center bg-black/60 px-5"><Pressable onPress={() => {}} className="rounded-2xl border border-[#2A455F] bg-[#0B1624] p-4"><Text className="text-[10px] font-bold text-primary">GO TO LINE</Text><TextInput value={gotoLine} onChangeText={setGotoLine} keyboardType="number-pad" autoFocus placeholder="Numer linii" placeholderTextColor="#71839A" className="mt-3 rounded-lg border border-[#27415B] bg-[#08131F] px-3 py-3 font-mono text-sm text-foreground" /><View className="mt-3"><ActionButton label="Przejdź" onPress={() => jumpToLine(Number(gotoLine) || 1)} /></View></Pressable></Pressable></Modal>

    <Modal visible={showPalette} transparent animationType="fade" onRequestClose={() => setShowPalette(false)}><Pressable onPress={() => setShowPalette(false)} className="flex-1 justify-start bg-black/60 px-5 pt-24"><Pressable onPress={() => {}} className="rounded-2xl border border-[#2A455F] bg-[#0B1624] p-3"><View className="flex-row items-center px-2 pb-2"><Text className="text-[9px] font-bold tracking-wide text-muted">COMMAND PALETTE</Text><View className="flex-1" /><Text className="font-mono text-[8px] text-muted">{paletteItems.length} commands</Text></View><ScrollView className="max-h-[520px]">{paletteItems.map(([label, action]) => <Pressable key={label} onPress={() => action()} className="border-b border-[#20344A] px-2 py-3"><Text className="text-[11px] text-foreground">{label}</Text></Pressable>)}</ScrollView></Pressable></Pressable></Modal>
  </ScreenContainer>;
}
