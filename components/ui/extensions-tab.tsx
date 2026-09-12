import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, TextInput, View } from "react-native";

type Extension = {
  id: string;
  name: string;
  publisher: string;
  version: string;
  description: string;
  rating: number;
  downloads: number;
  categories: string[];
  tags: string[];
  icon: string;
  installed?: boolean;
};

const EXTENSION_MARKETPLACE: Extension[] = [
  // Language Support
  { id: "kotlin-lang", name: "Kotlin Language", publisher: "Jetbrains", version: "1.9.0", description: "Kotlin language support with syntax highlighting and smart completion", rating: 4.8, downloads: 1200000, categories: ["Languages"], tags: ["kotlin", "android", "jvm"], icon: "KT", installed: false },
  { id: "java-lang", name: "Java Language Support", publisher: "Google", version: "2.1.3", description: "Complete Java language support for Android development", rating: 4.9, downloads: 5000000, categories: ["Languages"], tags: ["java", "android"], icon: "J", installed: false },
  { id: "typescript-lang", name: "TypeScript", publisher: "Microsoft", version: "5.1.0", description: "TypeScript language support with advanced type checking", rating: 5.0, downloads: 8000000, categories: ["Languages"], tags: ["typescript", "javascript"], icon: "TS", installed: false },
  { id: "python-lang", name: "Python", publisher: "Microsoft", version: "2024.0.1", description: "Python language support with linting and debugging", rating: 4.7, downloads: 6000000, categories: ["Languages"], tags: ["python", "scripting"], icon: "PY", installed: false },
  
  // Android Development
  { id: "gradle-helper", name: "Gradle for Android", publisher: "Google", version: "1.4.2", description: "Gradle build system support and Android build configuration", rating: 4.6, downloads: 800000, categories: ["Build Tools"], tags: ["gradle", "android", "build"], icon: "G", installed: false },
  { id: "android-res", name: "Android Resources Manager", publisher: "Dev", version: "2.0.1", description: "Manage Android resources, strings, layouts with preview", rating: 4.5, downloads: 350000, categories: ["Android"], tags: ["resources", "android"], icon: "A", installed: false },
  { id: "xml-formatter", name: "XML & Layout Formatter", publisher: "Redhat", version: "0.28.0", description: "XML formatting and Android layout editing support", rating: 4.7, downloads: 500000, categories: ["Formatters"], tags: ["xml", "android", "layout"], icon: "X", installed: false },
  
  // Git & Version Control
  { id: "git-graph", name: "Git Graph", publisher: "mhutchie", version: "1.32.0", description: "View a Git Graph (repository commit history) in Visual Studio Code", rating: 4.8, downloads: 3000000, categories: ["SCM"], tags: ["git", "version-control"], icon: "G", installed: false },
  { id: "github-cli", name: "GitHub CLI", publisher: "Github", version: "0.1.10", description: "GitHub CLI integration for pull requests and issues", rating: 4.5, downloads: 400000, categories: ["SCM"], tags: ["github", "git", "cli"], icon: "GH", installed: false },
  
  // Testing & Debugging
  { id: "vitest-runner", name: "Vitest Runner", publisher: "vitest", version: "0.35.0", description: "Run and debug Vitest tests with visual interface", rating: 4.6, downloads: 280000, categories: ["Testing"], tags: ["testing", "vitest", "unit-test"], icon: "V", installed: false },
  { id: "jest-runner", name: "Jest Runner", publisher: "sackrin", version: "0.5.6", description: "Jest test runner with inline code lens", rating: 4.4, downloads: 350000, categories: ["Testing"], tags: ["testing", "jest"], icon: "J", installed: false },
  { id: "test-explorer", name: "Test Explorer", publisher: "Humao", version: "2.21.3", description: "Run and debug tests in the Test Explorer sidebar", rating: 4.7, downloads: 500000, categories: ["Testing"], tags: ["testing", "explorer"], icon: "T", installed: false },
  
  // AI & Productivity
  { id: "ai-copilot", name: "GitHub Copilot", publisher: "Github", version: "1.198.0", description: "AI pair programmer that helps with code suggestions", rating: 4.8, downloads: 2500000, categories: ["AI"], tags: ["ai", "copilot", "productivity"], icon: "C", installed: false },
  { id: "codeium", name: "Codeium", publisher: "Codeium", version: "1.7.50", description: "Free AI code completion alternative to Copilot", rating: 4.6, downloads: 1000000, categories: ["AI"], tags: ["ai", "completion", "free"], icon: "C", installed: false },
  { id: "tabnine", name: "Tabnine", publisher: "Tabnine", version: "3.36.0", description: "AI-powered code completion with privacy focus", rating: 4.5, downloads: 800000, categories: ["AI"], tags: ["ai", "completion", "privacy"], icon: "T", installed: false },
  
  // Code Quality
  { id: "eslint", name: "ESLint", publisher: "Microsoft", version: "2.4.4", description: "JavaScript/TypeScript linting with ESLint", rating: 4.9, downloads: 7000000, categories: ["Linters"], tags: ["eslint", "lint", "javascript"], icon: "E", installed: false },
  { id: "prettier", name: "Prettier - Code Formatter", publisher: "Prettier", version: "10.1.0", description: "Code formatter with Prettier support", rating: 4.8, downloads: 8500000, categories: ["Formatters"], tags: ["prettier", "format", "code-style"], icon: "P", installed: false },
  { id: "sonarqube", name: "SonarQube", publisher: "Sonarsource", version: "4.14.0", description: "Code quality and security analysis with SonarQube", rating: 4.6, downloads: 600000, categories: ["Linters"], tags: ["quality", "security", "analysis"], icon: "S", installed: false },
  
  // Documentation & Comments
  { id: "jsdoc-helper", name: "JSDoc Helper", publisher: "dev", version: "1.2.0", description: "Intelligent JSDoc and TSDoc comment generation", rating: 4.5, downloads: 200000, categories: ["Documentation"], tags: ["jsdoc", "comments", "docs"], icon: "D", installed: false },
  { id: "markdown-preview", name: "Markdown Preview Enhanced", publisher: "Yiyi", version: "0.8.17", description: "Markdown preview with extended features", rating: 4.7, downloads: 1200000, categories: ["Documentation"], tags: ["markdown", "preview"], icon: "M", installed: false },
  
  // Theming & UI
  { id: "theme-dracula", name: "Dracula Official", publisher: "dracula", version: "2.26.0", description: "Dark theme based on the Dracula color scheme", rating: 4.9, downloads: 2000000, categories: ["Themes"], tags: ["theme", "dark", "color-scheme"], icon: "D", installed: false },
  { id: "theme-nord", name: "Nord", publisher: "arctic-ice-studio", version: "0.20.1", description: "Arctic, north-bluish color scheme theme", rating: 4.8, downloads: 1500000, categories: ["Themes"], tags: ["theme", "cool", "color-scheme"], icon: "N", installed: false },
  { id: "material-icon", name: "Material Icon Theme", publisher: "pkief", version: "5.7.0", description: "Material Design icons for files and folders", rating: 4.9, downloads: 4000000, categories: ["Themes"], tags: ["icons", "material", "theme"], icon: "M", installed: false },
];

interface ExtensionsTabProps {
  onInstall?: (extension: Extension) => void;
  onUninstall?: (extension: Extension) => void;
  installedIds?: string[];
}

export function ExtensionsTab({ onInstall, onUninstall, installedIds = [] }: ExtensionsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"rating" | "downloads" | "name">("rating");
  const [installing, setInstalling] = useState<string | null>(null);
  const [allExtensions, setAllExtensions] = useState(EXTENSION_MARKETPLACE);

  // Mark installed extensions
  useEffect(() => {
    setAllExtensions((prev) =>
      prev.map((ext) => ({ ...ext, installed: installedIds.includes(ext.id) }))
    );
  }, [installedIds]);

  const filteredExtensions = useMemo(() => {
    let result = allExtensions;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (ext) =>
          ext.name.toLowerCase().includes(q) ||
          ext.description.toLowerCase().includes(q) ||
          ext.publisher.toLowerCase().includes(q) ||
          ext.tags.some((tag) => tag.includes(q))
      );
    }

    if (selectedCategory) {
      result = result.filter((ext) => ext.categories.includes(selectedCategory));
    }

    // Sort
    return result.sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "downloads") return b.downloads - a.downloads;
      return a.name.localeCompare(b.name);
    });
  }, [allExtensions, searchQuery, selectedCategory, sortBy]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    EXTENSION_MARKETPLACE.forEach((ext) => ext.categories.forEach((cat) => cats.add(cat)));
    return Array.from(cats).sort();
  }, []);

  const handleInstall = useCallback(
    async (ext: Extension) => {
      setInstalling(ext.id);
      try {
        await new Promise((resolve) => setTimeout(resolve, 800));
        setAllExtensions((prev) =>
          prev.map((e) => (e.id === ext.id ? { ...e, installed: true } : e))
        );
        onInstall?.(ext);
        Alert.alert("Zainstalowano", `${ext.name} został zainstalowany.`);
      } catch (error) {
        Alert.alert("Błąd", "Nie udało się zainstalować rozszerzenia.");
      } finally {
        setInstalling(null);
      }
    },
    [onInstall]
  );

  const handleUninstall = useCallback(
    async (ext: Extension) => {
      Alert.alert(
        "Odinstaluj rozszerzenie",
        `Czy na pewno chcesz usunąć ${ext.name}?`,
        [
          { text: "Anuluj", style: "cancel" },
          {
            text: "Odinstaluj",
            style: "destructive",
            onPress: async () => {
              setInstalling(ext.id);
              try {
                await new Promise((resolve) => setTimeout(resolve, 600));
                setAllExtensions((prev) =>
                  prev.map((e) => (e.id === ext.id ? { ...e, installed: false } : e))
                );
                onUninstall?.(ext);
                Alert.alert("Usunięto", `${ext.name} został odinstalowany.`);
              } finally {
                setInstalling(null);
              }
            },
          },
        ]
      );
    },
    [onUninstall]
  );

  const renderExtensionItem = ({ item: ext }: { item: Extension }) => (
    <Pressable
      className="border-b border-[#20344A] bg-[#09131F] px-3 py-3 hover:bg-[#0A1724]"
      style={({ pressed }) => ({ backgroundColor: pressed ? "#0A1724" : "#09131F" })}
    >
      <View className="flex-row items-start gap-3">
        {/* Icon */}
        <View className="mt-1 h-10 w-10 items-center justify-center rounded-lg border border-[#2F7DA2] bg-[#0A1E2E]">
          <Text className="font-mono text-xs font-bold text-[#39D0FF]">{ext.icon}</Text>
        </View>

        {/* Content */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-semibold text-foreground" numberOfLines={1}>
              {ext.name}
            </Text>
            <Text className="text-[11px] text-muted">{ext.version}</Text>
          </View>
          <Text className="text-[11px] text-[#71839A]">{ext.publisher}</Text>
          <Text className="mt-1 text-[10px] leading-4 text-foreground" numberOfLines={2}>
            {ext.description}
          </Text>

          {/* Stats & Tags */}
          <View className="mt-2 flex-row flex-wrap gap-2">
            {/* Rating */}
            <View className="flex-row items-center gap-1 rounded-md bg-[#0B1E2C] px-2 py-1">
              <Text className="text-[9px] text-[#F2B24B]">★</Text>
              <Text className="text-[9px] text-foreground">{ext.rating}</Text>
            </View>

            {/* Downloads */}
            <View className="flex-row items-center gap-1 rounded-md bg-[#0B1E2C] px-2 py-1">
              <Text className="text-[9px] text-muted">↓</Text>
              <Text className="text-[9px] text-foreground">
                {ext.downloads > 1000000
                  ? `${(ext.downloads / 1000000).toFixed(1)}M`
                  : ext.downloads > 1000
                  ? `${(ext.downloads / 1000).toFixed(0)}K`
                  : ext.downloads}
              </Text>
            </View>

            {/* Tags */}
            {ext.tags.slice(0, 2).map((tag) => (
              <View key={tag} className="rounded-md bg-[#0C2241] px-2 py-1">
                <Text className="text-[8px] text-[#6FA8FF]">{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Install/Uninstall Button */}
        <View className="mt-1">
          {installing === ext.id ? (
            <ActivityIndicator size={24} color="#39D0FF" />
          ) : ext.installed ? (
            <Pressable
              onPress={() => handleUninstall(ext)}
              className="rounded-lg border border-[#FF718B] bg-[#2D0B15] px-4 py-2"
            >
              <Text className="text-xs font-semibold text-[#FF718B]">Usuń</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => handleInstall(ext)}
              className="rounded-lg border border-[#39D0FF] bg-[#0A1E2E] px-4 py-2"
            >
              <Text className="text-xs font-semibold text-[#39D0FF]">Instaluj</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-[#07101A]">
      {/* Header */}
      <View className="border-b border-[#20344A] bg-[#0B1624] px-3 py-3">
        <Text className="text-[10px] font-bold tracking-[1.5px] text-primary">EXTENSIONS • MARKETPLACE</Text>
        <Text className="mt-1 text-xs text-muted">{filteredExtensions.length} rozszerzeń</Text>
      </View>

      {/* Search Bar */}
      <View className="border-b border-[#20344A] bg-[#09131F] px-3 py-2">
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Szukaj rozszerzeń..."
          placeholderTextColor="#71839A"
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-lg border border-[#20344A] bg-[#0B1724] px-3 py-2 font-mono text-sm text-foreground"
        />
      </View>

      {/* Category Filter */}
      <View className="border-b border-[#20344A] bg-[#08131F]">
        <FlatList
          horizontal
          scrollEnabled
          showsHorizontalScrollIndicator={false}
          data={["All", ...categories]}
          keyExtractor={(item) => item}
          renderItem={({ item: cat }) => (
            <Pressable
              onPress={() => setSelectedCategory(cat === "All" ? null : cat)}
              className={`border-r border-[#20344A] px-3 py-2 ${
                (cat === "All" && !selectedCategory) || selectedCategory === cat
                  ? "bg-[#0C2241] border-b-2 border-b-[#39D0FF]"
                  : "bg-[#08131F]"
              }`}
            >
              <Text
                className={`text-[11px] font-semibold ${
                  (cat === "All" && !selectedCategory) || selectedCategory === cat
                    ? "text-[#39D0FF]"
                    : "text-muted"
                }`}
              >
                {cat}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Sort Options */}
      <View className="border-b border-[#20344A] bg-[#09131F] px-3 py-2">
        <Text className="mb-1 text-[9px] font-bold text-muted">SORTUJ WGLĄDEM</Text>
        <View className="flex-row gap-2">
          {(["rating", "downloads", "name"] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setSortBy(option)}
              className={`rounded-lg border px-3 py-1 ${
                sortBy === option
                  ? "border-[#39D0FF] bg-[#0A1E2E]"
                  : "border-[#20344A] bg-transparent"
              }`}
            >
              <Text
                className={`text-[10px] font-semibold ${
                  sortBy === option ? "text-[#39D0FF]" : "text-muted"
                }`}
              >
                {option === "rating"
                  ? "Ocena ⭐"
                  : option === "downloads"
                  ? "Popularne ↓"
                  : "Nazwa A-Z"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Extensions List */}
      {filteredExtensions.length > 0 ? (
        <FlatList
          data={filteredExtensions}
          keyExtractor={(item) => item.id}
          renderItem={renderExtensionItem}
          scrollEnabled
          scrollEventThrottle={16}
        />
      ) : (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-center text-sm text-muted">
            Brak rozszerzeń spełniających kryteria wyszukiwania.
          </Text>
          {searchQuery && (
            <Pressable
              onPress={() => {
                setSearchQuery("");
                setSelectedCategory(null);
              }}
              className="mt-3 rounded-lg border border-[#39D0FF] bg-[#0A1E2E] px-4 py-2"
            >
              <Text className="text-xs font-semibold text-[#39D0FF]">Wyczyść filtry</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
