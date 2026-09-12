# 📋 Architektura Aplikacji AI APK Forge IDE v4

## 📖 Spis Treści
1. [Przegląd Systemu](#przegląd-systemu)
2. [Struktura Projektów](#struktura-projektów)
3. [Konfiguracja i Ustawienia](#konfiguracja-i-ustawienia)
4. [Warstwa Aplikacji (App)](#warstwa-aplikacji-app)
5. [Komponenty UI (Components)](#komponenty-ui-components)
6. [Warstwa Serwera (Server)](#warstwa-serwera-server)
7. [Biblioteki Wspólne (Lib)](#biblioteki-wspólne-lib)
8. [Hooki React (Hooks)](#hooki-react-hooks)
9. [Zasoby i Styling](#zasoby-i-styling)
10. [Build & Konfiguracja](#build--konfiguracja)

---

## 🏗️ Przegląd Systemu

**AI APK Forge IDE v4** to mobilna aplikacja Expo + React Native stworzona dla:
- 📱 Budowania APK z projektów Android
- 🤖 Integracji z sztuczną inteligencją do analizy i naprawy błędów
- 🌐 Zarządzania projektem poprzez GitHub
- 💻 Symulacji VS Code IDE na urządzeniu mobilnym

### Główne Technologie:
- **Frontend:** React 19, React Native, Expo 54
- **Backend:** Node.js, Express, tRPC
- **Baza Danych:** MySQL 8+ (Drizzle ORM)
- **Styling:** Tailwind CSS + NativeWind
- **AI Integration:** OpenAI API, Voice Transcription
- **Package Manager:** pnpm 9.12.0
- **TypeScript:** 5.9.3 (strict mode)

---

## 📁 Struktura Projektów

```
ai-apk-forge-vscode-ai-ide-v4/
├── app/                    # Strony i layout aplikacji (Expo Router)
├── components/            # Komponenty React (UI)
├── lib/                    # Biblioteki i utility functions
├── hooks/                  # Custom React Hooks
├── server/                 # Backend - tRPC + Express
├── shared/                 # Kod wspólny (types, constants)
├── assets/                 # Zasoby (ikony, obrazy)
├── docs/                   # Dokumentacja
├── scripts/                # Skrypty pomocnicze
├── tests/                  # Testy automatyczne
├── constants/              # Stałe aplikacji
├── config files/           # app.config.ts, tsconfig.json, itd.
└── package.json            # Dependencje projektu
```

---

## ⚙️ Konfiguracja i Ustawienia

### 📄 `app.config.ts`
**Lokalizacja:** `/app.config.ts`
**Przeznaczenie:** Główny plik konfiguracyjny Expo

**Główne funkcje:**
- Konfiguracja Bundle ID dla iOS/Android
- Schemat deep linking (URI scheme)
- Ustawienia splash screen
- Konfiguracja pluginów (audio, video, secure storage)
- Adaptive Icons dla Android
- Obsługa Intent Filters

**Kluczowe wartości:**
```typescript
appName: "AI APK Forge"
appSlug: "ai-apk-forge"
iosBundleId: "com.app.aiapkforge"
androidPackage: "com.app.aiapkforge"
scheme: "manus{timestamp}"
```

### 📄 `package.json`
**Lokalizacja:** `/package.json`
**Przeznaczenie:** Manifest projektu NPM - zależności i skrypty

**Główne skrypty:**
- `dev` - Uruchamia server i Metro bundle manager jednocześnie
- `dev:server` - Serwer tRPC w trybie watch
- `dev:metro` - Expo Metro bundler dla web/mobile
- `build` - Bundowanie serwera na production
- `start` - Uruchomienie serwera w prod
- `db:push` - Migracja bazy danych (Drizzle)
- `android` / `ios` - Budowanie native apk/ipa

**Kluczowe dependencje:**
- React Native, Expo (UI framework)
- tRPC, Axios (komunikacja)
- React Query (cache'owanie zapytań)
- Drizzle ORM (baza danych)
- MySQL2 (driver bazy)
- Jose (JWT authentication)
- NativeWind (Tailwind CSS na React Native)

### 📄 `tsconfig.json`
**Lokalizacja:** `/tsconfig.json`
**Przeznaczenie:** Konfiguracja TypeScript

**Ścieżki aliasów:**
```typescript
"@/*" → "./*"           // Root
"@shared/*" → "./shared/*"  // Shared code
```

**Ustawienia:**
- `strict: true` - Ścisła weryfikacja typów
- Obsługa NativeWind types
- Obsługa Node.js types

### 📄 `tailwind.config.js`
**Lokalizacja:** `/tailwind.config.js`
**Przeznaczenie:** Konfiguracja Tailwind CSS dla NativeWind

**Definiuje kolory aplikacji:**
- `#09111F` - Tło główne (głęboki granat)
- `#56E0C0` - Akcent podstawowy (teal)
- `#6FA8FF` - Akcent pomocniczy (niebieski)
- `#F2B24B` - Ostrzeżenie (złoty)
- `#FF718B` - Błąd (różowy/czerwony)

### 📄 `babel.config.js`
**Lokalizacja:** `/babel.config.js`
**Przeznaczenie:** Konfiguracja Babel transpilera

Obsługuje:
- Preset Expo (transpilacja do JavaScript)
- Plugin React Native Reanimated
- Transformacja JSX

### 📄 `metro.config.js`
**Lokalizacja:** `/metro.config.js`
**Przeznaczenie:** Konfiguracja Metro bundlera (React Native)

### 📄 `drizzle.config.ts`
**Lokalizacja:** `/drizzle.config.ts`
**Przeznaczenie:** Konfiguracja Drizzle ORM

Obsługuje migracje bazy MySQL

### 📄 `.watchmanconfig`
**Lokalizacja:** `/.watchmanconfig`
**Przeznaczenie:** Konfiguracja Watchmana (obserwacja zmian plików)

### 📄 `.npmrc`
**Lokalizacja:** `/.npmrc`
**Przeznaczenie:** Konfiguracja npm/pnpm

### 📄 `theme.config.js`
**Lokalizacja:** `/theme.config.js`
**Przeznaczenie:** Definiuje kolory i zmienne CSS dla aplikacji

**Typ definiuje:** `theme.config.d.ts`

### 📄 `eslint.config.js`
**Lokalizacja:** `/eslint.config.js`
**Przeznaczenie:** Linting kodu JavaScript/TypeScript

### 📄 `template.json`
**Lokalizacja:** `/template.json`
**Przeznaczenie:** Template konfiguracyjny (React Native template)

---

## 🎨 Warstwa Aplikacji (App)

### Struktura katalogów
```
app/
├── _layout.tsx              # Root layout (provider setup)
├── (tabs)/                  # Tab-based navigation
│   ├── _layout.tsx
│   ├── index.tsx            # Home screen
│   ├── code.tsx             # IDE Code Editor
│   ├── assistant.tsx        # AI Chat Assistant
│   ├── run.tsx              # Build & Run screen
│   └── settings.tsx         # Ustawienia aplikacji
├── dev/                     # Development screens
├── oauth/                   # OAuth callback handler
│   └── callback.tsx
```

### 📄 `app/_layout.tsx`
**Przeznaczenie:** Root layout całej aplikacji

**Co robi:**
- Inicjalizuje QueryClient (React Query)
- Tworzy tRPC client do komunikacji z serwerem
- Setupuje SafeAreaContext (obsługa notchów)
- Inicjalizuje Manus Runtime (obsługa cookies)
- Definiuje Stack Navigation
- Setupuje ThemeProvider

**Kluczowe elementy:**
```typescript
- QueryClientProvider (caching zapytań)
- trpc.Provider (RPC client)
- BuildSessionProvider (stan sesji budowania)
- SafeAreaProvider (safe area insets)
- ThemeProvider (kolory/tema)
- GestureHandlerRootView (gestures)
```

### 📄 `app/(tabs)/_layout.tsx`
**Przeznaczenie:** Layout dla sekcji tabs

Definiuje dolny pasek nawigacji z 4-5 zakładkami:
1. Home (index)
2. Code Editor
3. Assistant (Chat AI)
4. Run (Budowanie)
5. Settings (Ustawienia)

### 📄 `app/(tabs)/index.tsx`
**Przeznaczenie:** Ekran główny - Home

**Wyświetla:**
- Status połączenia GitHub
- Status Mostu Termux
- Akcje: Nowe zadanie, Historia budów
- Szybkie ustawienia

### 📄 `app/(tabs)/code.tsx` ⭐
**Przeznaczenie:** IDE Editor - główny ekran do edycji kodu

**Wymiary kodu:** ~43KB (największy plik aplikacji)

**Komponenty:**
- Explorer (lista plików)
- File Tabs (otwarte pliki)
- Code Editor (pole tekstowe z syntax highlighting)
- Terminal (logging i output)
- Command Palette (szybkie komendy)
- Breadcrumbs (ścieżka nawigacyjna)
- Git Status/Diff View
- Search with Go to Line

**Funkcjonalności:**
- Edycja wielu plików
- Preview zmian
- Syntax highlighting (TypeScript, Java, XML, etc.)
- Git diff viewer
- Undo/Redo
- File tree navigation

### 📄 `app/(tabs)/assistant.tsx`
**Przeznaczenie:** Chat z AI Asystentem

**Wymiary:** ~8KB

**Funkcjonalności:**
- Chat historia
- Wysyłanie zapytań do AI
- Voice input (transkrypcja audio)
- Kontekst z aktualnego pliku
- AI Quick Fix suggestions
- Streaming responses

### 📄 `app/(tabs)/run.tsx`
**Przeznaczenie:** Ekran budowania i uruchamiania APK

**Wymiary:** ~13KB

**Wyświetla:**
- Etapy budowania (sekwencja kroków)
- Progress bar dla każdego etapu
- Logi i output
- Przycisk Start/Stop
- Pobieranie artefaktu APK
- Status GitHub Actions

**Etapy:**
1. Analiza projektu
2. Git commit & push
3. Publikacja na GitHub
4. Budowanie APK
5. Naprawa błędów (jeśli są)
6. Pobieranie artefaktu

### 📄 `app/(tabs)/settings.tsx`
**Przeznaczenie:** Ustawienia aplikacji

**Wymiary:** ~4.5KB

**Opcje:**
- Adres Mostu Termux
- Klucz parowania
- Token GitHub (secure storage)
- Tryb zatwierdzania (auto/manual)
- Reset danych
- Instrukcja instalacji mostu

---

## 🎯 Komponenty UI (Components)

### Struktura katalogów
```
components/
├── external-link.tsx           # Link do stron zewnętrznych
├── forge-ui.tsx               # Custom UI components
├── haptic-tab.tsx             # Tab z haptic feedback
├── hello-wave.tsx             # Animowana falka powitalnej
├── parallax-scroll-view.tsx   # ScrollView z parallax effect
├── screen-container.tsx       # Container dla ekranów
├── themed-view.tsx            # View z obsługą motywu
├── ui/                        # Zaawansowane komponenty
│   ├── collapsible.tsx
│   ├── icon-symbol.tsx
│   ├── icon-symbol.ios.tsx
```

### 📄 `components/external-link.tsx`
**Wymiary:** 794 bytes

Komponent linkujący do stron zewnętrznych.
- Otwiera przeglądarkę
- Obsługuje Deep Linking

### 📄 `components/forge-ui.tsx`
**Wymiary:** 2958 bytes

Eksportuje custom UI komponenty specyficzne dla aplikacji:
- ForgeButton (przycisk)
- ForgeCard (karta)
- ForgeInput (pole input)
- ForgeText (tekst ze stylami)

### 📄 `components/haptic-tab.tsx`
**Wymiary:** 564 bytes

Tab navigacyjny z haptycznym feedbackiem.
- Drga przy dotknięciu
- Ikona + etykieta

### 📄 `components/hello-wave.tsx`
**Wymiary:** 410 bytes

Animowana falka powitalnej (wave animation).

### 📄 `components/parallax-scroll-view.tsx`
**Wymiary:** 2102 bytes

ScrollView z efektem parallax:
- Header pozostaje w tyle
- Zawartość scrolluje szybciej
- Efekt głębi

### 📄 `components/screen-container.tsx`
**Wymiary:** 1661 bytes

Container dla całych ekranów:
- Obsługuje safe area insets
- Automatyczne padding
- Flexbox layout
- Obsługa ScrollView

### 📄 `components/themed-view.tsx`
**Wymiary:** 461 bytes

View z automatyczną obsługą motywu:
- Light/Dark mode
- Dynamiczne kolory z theme'u
- Accessibility

### 📄 `components/ui/collapsible.tsx`
**Wymiary:** 1004 bytes

Komponent Collapsible (rozwijany):
- Header + zawartość
- Animacja otwarcia/zamknięcia
- Accessible (aria)

### 📄 `components/ui/icon-symbol.tsx`
**Wymiary:** 1722 bytes

Komponent do wyświetlania ikon:
- Support dla SF Symbols (iOS)
- Fallback dla Android
- Kolorowanie

### 📄 `components/ui/icon-symbol.ios.tsx`
**Wymiary:** 598 bytes

Specjalizowana wersja dla iOS z SF Symbols.

---

## 🖥️ Warstwa Serwera (Server)

### Struktura katalogów
```
server/
├── _core/                    # Jądro aplikacji serwera
│   ├── index.ts             # Entry point serwera
│   ├── context.ts           # tRPC context
│   ├── trpc.ts              # tRPC setup
│   ├── cookies.ts           # HTTP-only cookies
│   ├── env.ts               # Zmienne środowiska
│   ├── llm.ts               # Integracja z AI (OpenAI)
│   ├── oauth.ts             # GitHub OAuth
│   ├── sdk.ts               # SDK do komunikacji z mostem
│   ├── heartbeat.ts         # Monitoring połączenia
│   ├── notification.ts      # Push notifications
│   ├── voiceTranscription.ts # Transkrypcja audio (Whisper API)
│   ├── imageGeneration.ts   # Generowanie obrazów (DALL-E)
│   ├── dataApi.ts           # Interfejs do bazy danych
│   ├── storageProxy.ts      # Proxy do storage S3
│   ├── systemRouter.ts      # System routes
│   └── types/               # TypeScript types
├── db.ts                     # Database connection
├── routers.ts               # tRPC routers definicje
└── storage.ts               # Cloud storage config
```

### 📄 `server/_core/index.ts`
**Przeznaczenie:** Entry point serwera

Co robi:
- Inicjalizuje Express app
- Setupuje middleware (cors, body parser)
- Montuje tRPC handler
- Setupuje OAuth callback route
- Setupuje heartbeat monitoring
- Startuje serwer na porcie (default 3000)

### 📄 `server/_core/context.ts`
**Wymiary:** 654 bytes

Definiuje kontekst tRPC:
- Pobiera z cookies
- Inicjalizuje session
- Dostęp do bazy danych

### 📄 `server/_core/trpc.ts`
**Wymiary:** 1045 bytes

Setup tRPC:
- Inicjalizuje router
- Middlewares
- Error handling

### 📄 `server/_core/cookies.ts`
**Wymiary:** 1831 bytes

Zarządzanie cookies:
- Czytanie HTTP-only cookies
- Bezpieczne sesje
- CSRF protection

### 📄 `server/_core/env.ts`
**Wymiary:** 428 bytes

Zmienne środowiska aplikacji:
- API keys (OpenAI, GitHub)
- Database URL
- Server PORT
- Environment (dev/prod)

### 📄 `server/_core/llm.ts` ⭐
**Wymiary:** ~10.6KB

**Przeznaczenie:** Integracja z AI (OpenAI API)

**Funkcjonalności:**
- Wysyłanie zapytań do GPT
- Streaming responses
- System prompts
- Token counting
- Error handling

**Modele:**
- `gpt-4-turbo` (analiza, naprawa kodów)
- `gpt-4o-mini` (szybkie odpowiedzi)

**Zadania:**
- Analiza błędów z logów
- Sugerowanie poprawek
- Wyjaśnianie kodów
- Generowanie testów

### 📄 `server/_core/oauth.ts`
**Wymiary:** 5983 bytes

**Przeznaczenie:** GitHub OAuth 2.0 flow

**Proces:**
1. Redirect do GitHub authorization
2. GitHub zwraca code
3. Server wymienia code na access_token
4. Pobiera dane użytkownika
5. Zapisuje w secure cookies
6. Redirect do aplikacji

**Endpoints:**
- `/auth/github` - Inicjalizacja OAuth
- `/auth/github/callback` - Callback z GitHub

### 📄 `server/_core/sdk.ts` ⭐
**Wymiary:** 9744 bytes

**Przeznaczenie:** SDK do komunikacji z Mostem Termux

Most Termux to lokalny serwer uruchamiający na urządzeniu Android komendy terminala.

**Funkcjonalności:**
- Wysyłanie komend Shell
- Pobieranie outputu
- Zarządzanie plikami
- Monitoring procesów

**Metody:**
- `executeCommand(cmd)` - Uruchomienie komendy
- `getFile(path)` - Pobieranie pliku
- `putFile(path, content)` - Zapisanie pliku
- `downloadAPK()` - Pobranie artefaktu

### 📄 `server/_core/heartbeat.ts`
**Wymiary:** 6784 bytes

**Przeznaczenie:** Monitoring połączenia z Mostem Termux

**Funkcjonalności:**
- Periodic health check
- Timeout detection
- Reconnection logic
- Status reporting
- WebSocket support

**Co monituje:**
- Połączenie z Mostem
- Dostępność GitHub API
- Status bazy danych

### 📄 `server/_core/notification.ts`
**Wymiary:** 3116 bytes

**Przeznaczenie:** Push notifications

**Typy:**
- Build complete
- Build failed
- User approval required
- New AI suggestion
- Connection lost

### 📄 `server/_core/voiceTranscription.ts` ⭐
**Wymiary:** 8008 bytes

**Przeznaczenie:** Transkrypcja audio za pomocą Whisper API (OpenAI)

**Funkcjonalności:**
- Konwersja audio → tekst
- Support dla mp3, wav, m4a
- Transkrypcja polskiego
- Streaming audio
- Error handling

**Zastosowanie:**
- Voice input w chat z AI
- Dikte komend

### 📄 `server/_core/imageGeneration.ts`
**Wymiary:** 4392 bytes

**Przeznaczenie:** Generowanie obrazów za pomocą DALL-E 3

**Funkcjonalności:**
- Generowanie ikon aplikacji
- Tworzenie logo
- Image URL upload do storage S3

### 📄 `server/_core/dataApi.ts`
**Wymiary:** 1901 bytes

**Przeznaczenie:** Interfejs dostępu do bazy danych

Wrapper do `db.ts` z funkcjami:
- `query(sql, params)`
- `transaction(callback)`
- Connection pooling

### 📄 `server/_core/storageProxy.ts`
**Wymiary:** 1392 bytes

**Przeznaczenie:** Proxy do cloud storage (AWS S3)

Obsługuje:
- Upload plików
- Download plików
- URL signing
- Cache headers

### 📄 `server/_core/systemRouter.ts`
**Wymiary:** 711 bytes

**Przeznaczenie:** System routes (health check, version)

Endpoints:
- `/health` - Health check
- `/version` - Wersja aplikacji
- `/status` - Status systemu

### 📄 `server/db.ts`
**Wymiary:** 2511 bytes

**Przeznaczenie:** Konfiguracja i inicjalizacja bazy MySQL

**Co zawiera:**
- Connection pool do MySQL
- Drizzle ORM setup
- Schema definicje
- Migration runner

**Funkcjonalności:**
- Persistent connection
- Connection pooling
- Query logging (dev)
- Error recovery

### 📄 `server/routers.ts`
**Wymiary:** 7089 bytes

**Przeznaczenie:** Definicje tRPC routerów

**Routers:**
- `auth` - GitHub login, logout, session
- `project` - CRUD dla projektów
- `build` - Start/stop build, get status
- `chat` - AI chat messages
- `file` - File operations
- `terminal` - Terminal output

**Typ zwracanego obiektu:**
```typescript
{
  procedure: type('query' | 'mutation'),
  input: input schema (Zod),
  output: output type
}
```

### 📄 `server/storage.ts`
**Wymiary:** 3052 bytes

**Przeznaczenie:** Konfiguracja cloud storage (AWS S3)

**Funkcjonalności:**
- Upload manager
- Signed URLs
- Cleanup old files
- CDN integration

---

## 📚 Biblioteki Wspólne (Lib)

### Struktura katalogów
```
lib/
├── _core/                    # Jądro bibliotek
│   ├── nativewind-pressable.ts  # Pressable Button fix
│   ├── manus-runtime.ts         # Manus runtime initialization
├── bridge-client.ts          # Komunikacja z mostem Termux
├── build-session-context.tsx # React Context dla sesji budowania
├── forge-policy.ts           # Polityka bezpieczeństwa
├── forge-storage.ts          # Local async storage
├── forge-types.ts            # TypeScript types
├── theme-provider.tsx        # Theme context
├── trpc.ts                   # tRPC client setup
├── utils.ts                  # Utility functions
```

### 📄 `lib/bridge-client.ts`
**Wymiary:** 3546 bytes

**Przeznaczenie:** Klient do komunikacji z Mostem Termux

**Funkcjonalności:**
- HTTP requests do mostu
- Request signing (security key)
- Error handling
- Retry logic
- Timeout management

**Metody:**
```typescript
BridgeClient.executeCommand(cmd: string)
BridgeClient.getFile(path: string)
BridgeClient.putFile(path: string, content: string)
BridgeClient.downloadAPK(outputPath: string)
BridgeClient.health()
```

### 📄 `lib/build-session-context.tsx` ⭐
**Wymiary:** 10197 bytes

**Przeznaczenie:** React Context dla stanu sesji budowania

Zarządza stanem globalnym:
- Aktualny etap budowania
- Logi output
- Status (running/success/error)
- Pliki projektu
- History budów

**Provides:**
```typescript
{
  sessionState: 'idle' | 'running' | 'completed' | 'failed',
  currentStage: 'analysis' | 'git' | 'publish' | 'build' | 'fix' | 'download',
  logs: string[],
  artifacts: {apk, logs, report},
  startBuild(projectPath, repoName),
  stopBuild(),
  resumeFix(),
  downloadArtifact()
}
```

### 📄 `lib/forge-policy.ts`
**Wymiary:** 2789 bytes

**Przeznaczenie:** Polityka bezpieczeństwa aplikacji

Defines:
- Approved commands whitelist
- Forbidden patterns (destruktywne komendy)
- Sandbox rules
- Token redaction patterns

**Funkcje:**
- `isCommandApproved(cmd)` - Walidacja komendy
- `redactTokens(text)` - Usuwanie wrażliwych danych
- `validatePath(path)` - Sprawdzenie ścieżki

### 📄 `lib/forge-storage.ts`
**Wymiary:** 2642 bytes

**Przeznaczenie:** Local Async Storage

Wrapper wokół `AsyncStorage` z:
- Type-safe access
- Default values
- JSON serialization
- Encryption (optional)

**Keys:**
- `auth_token`
- `bridge_url`
- `bridge_key`
- `last_project`
- `build_history`

### 📄 `lib/forge-types.ts`
**Wymiary:** 2763 bytes

**Przeznaczenie:** TypeScript type definitions

**Główne typy:**
```typescript
BuildSession = {
  id: string,
  projectPath: string,
  repoName: string,
  status: 'running' | 'success' | 'error',
  stages: BuildStage[],
  logs: string[],
  startTime: Date,
  endTime?: Date
}

BuildStage = {
  name: string,
  status: 'pending' | 'running' | 'success' | 'error',
  output: string,
  duration: number
}

BridgeConfig = {
  url: string,
  pairingKey: string,
  timeout: number
}
```

### 📄 `lib/theme-provider.tsx`
**Wymiary:** 2620 bytes

**Przeznaczenie:** React Context dla motywu (light/dark mode)

**Provides:**
```typescript
{
  isDark: boolean,
  colors: {
    background: string,
    surface: string,
    primary: string,
    secondary: string,
    error: string,
    warning: string
  },
  setIsDark(isDark: boolean)
}
```

**Kolory:**
- Background: `#09111F` (dark) / `#FFFFFF` (light)
- Primary: `#56E0C0` (teal)
- Secondary: `#6FA8FF` (blue)
- Error: `#FF718B` (pink)
- Warning: `#F2B24B` (gold)

### 📄 `lib/trpc.ts`
**Wymiary:** 1339 bytes

**Przeznaczenie:** Setup klienta tRPC

**Co zawiera:**
- Inicjalizacja `httpBatchLink`
- URL do serwera
- Request headers (auth token)
- Superjson serialization

### 📄 `lib/utils.ts`
**Wymiary:** 390 bytes

**Przeznaczenie:** Utility functions

Eksportuje:
- `cn()` - Class name merging (clsx + tailwind-merge)
- `formatFileSize()` - Formatowanie rozmiarów
- `formatDuration()` - Formatowanie czasu trwania

### 📄 `lib/_core/nativewind-pressable.ts`
Konfiguracja Pressable component z NativeWind.

### 📄 `lib/_core/manus-runtime.ts`
Setup Manus runtime:
- Inicjalizacja
- Cookie injection
- Safe area insets subscription

---

## 🪝 Hooki React (Hooks)

### Struktura katalogów
```
hooks/
├── use-auth.ts              # Autentykacja
├── use-color-scheme.ts      # Color scheme (native)
├── use-color-scheme.web.ts  # Color scheme (web)
└── use-colors.ts            # Kolory z thema
```

### 📄 `hooks/use-auth.ts` ⭐
**Wymiary:** 4622 bytes

**Przeznaczenie:** Hook do zarządzania autentykacją

**Provides:**
```typescript
{
  user: User | null,
  isLoading: boolean,
  isAuthenticated: boolean,
  token: string | null,
  
  login() → void Promise,
  logout() → void Promise,
  loginWithGitHub() → void Promise,
  refreshToken() → void Promise,
}
```

**Logika:**
- Pobiera token z AsyncStorage
- Waliduje token (expiry)
- Obsługuje refresh token
- GitHub OAuth flow

### 📄 `hooks/use-color-scheme.ts`
**Wymiary:** 134 bytes

**Przeznaczenie:** Hook do pobierania color scheme (native)

Na natywnym React Native pobiera:
- System light/dark mode
- Listen na zmiany

### 📄 `hooks/use-color-scheme.web.ts`
**Wymiary:** 480 bytes

**Przeznaczenie:** Hook do pobierania color scheme (web)

Na web:
- `window.matchMedia('(prefers-color-scheme: dark)')`
- Listen na zmiany
- SSR safe

### 📄 `hooks/use-colors.ts`
**Wymiary:** 504 bytes

**Przeznaczenie:** Hook do pobierania kolorów z thema

**Returns:**
```typescript
{
  bg: string,
  fg: string,
  primary: string,
  secondary: string,
  error: string,
  warning: string,
  success: string
}
```

---

## 🎨 Zasoby i Styling

### 📄 `global.css`
**Wymiary:** 59 bytes

**Przeznaczenie:** Globalne style CSS

Głównie:
- Reset CSS
- NativeWind directives

### 📄 `nativewind-env.d.ts`
**Wymiary:** 161 bytes

**Przeznaczenie:** TypeScript type definitions dla NativeWind

### 📄 `theme.config.js` / `theme.config.d.ts`
**Przeznaczenie:** Definicja motywu aplikacji

Definiuje kolory używane przez całą aplikację:
```typescript
colors: {
  primary: '#56E0C0',
  secondary: '#6FA8FF',
  error: '#FF718B',
  warning: '#F2B24B',
  background: '#09111F',
  surface: '#13233A',
  text: '#F4F7FB',
  textSecondary: '#A9B8CC'
}
```

### 📁 `assets/`
**Przeznaczenie:** Zasoby aplikacji

Zawiera:
- `images/icon.png` - App icon
- `images/splash-icon.png` - Splash screen
- `images/android-icon-*.png` - Android adaptive icons
- `images/favicon.png` - Favicon

---

## 🔨 Build & Konfiguracja

### 📄 `.gitignore`
**Wymiary:** 650 bytes

Ignoruje:
- `node_modules/`
- `dist/`
- `.env`
- `*.log`
- OS files
- IDE configs

### 📄 `pnpm-lock.yaml`
**Wymiary:** 443KB

Lock file dla pnpm - reproducible installs

---

## 🔄 Przepływ Danych

### Komunikacja Klient ↔ Serwer

```
React Component
    ↓
tRPC Client (lib/trpc.ts)
    ↓
HTTP Request
    ↓
Express Server (server/_core/index.ts)
    ↓
tRPC Handler
    ↓
Router (server/routers.ts)
    ↓
Database (server/db.ts) / API Calls
    ↓
Response
```

### Przepływ Budowania APK

```
User starts build (run.tsx)
    ↓
BuildSessionContext.startBuild()
    ↓
tRPC call → server/routers.ts
    ↓
SDK executes commands on Termux Bridge
    ↓
1. Git commit & push
    ↓
2. Trigger GitHub Actions
    ↓
3. Monitor build progress
    ↓
4. Download APK artifact
    ↓
Display in UI + Save
```

### Przepływ AI Assistance

```
User asks question (assistant.tsx)
    ↓
Voice Transcription (optional)
    ↓
tRPC call → server/routers.ts
    ↓
LLM.ts sends to OpenAI GPT API
    ↓
Stream response back
    ↓
Display in chat
```

---

## 🔒 Bezpieczeństwo

**Główne zasady:**

1. **Tokens & Secrets:**
   - GitHub token w HTTP-only cookies (serwer)
   - API keys w environment variables
   - Redaction pattern dla logów

2. **Validacja:**
   - Zod schemas dla input validation
   - Command whitelisting (forge-policy.ts)
   - Path sandbox checks

3. **Authentication:**
   - GitHub OAuth 2.0
   - JWT sessions
   - Session timeout

4. **Encryption:**
   - HTTPS w production
   - Secure cookies (HttpOnly, SameSite)
   - Optional local storage encryption

---

## 📊 Stack Techniczny - Summa

| Warstwa | Technologia | Plik |
|---------|------------|------|
| **Frontend** | React 19, React Native | app/, components/ |
| **Routing** | Expo Router | app/_layout.tsx |
| **State** | React Context, React Query | lib/build-session-context.tsx |
| **RPC** | tRPC 11.7 | lib/trpc.ts, server/_core/trpc.ts |
| **Backend** | Express.js | server/_core/index.ts |
| **Database** | MySQL 8+ | server/db.ts |
| **ORM** | Drizzle | drizzle.config.ts |
| **Styling** | Tailwind CSS + NativeWind | tailwind.config.js |
| **AI** | OpenAI GPT-4, DALL-E, Whisper | server/_core/llm.ts, imageGeneration.ts |
| **Storage** | AWS S3 | server/storage.ts |
| **Auth** | GitHub OAuth 2.0 | server/_core/oauth.ts |
| **Language** | TypeScript 5.9 | tsconfig.json |
| **Package Manager** | pnpm 9.12 | package.json |

---

## 🚀 Development & Deployment

### Development
```bash
pnpm install
pnpm dev              # Uruchamia serwer + Metro
pnpm dev:server       # Tylko serwer
pnpm dev:metro        # Tylko mobile app
```

### Production
```bash
pnpm build           # Bundowanie serwera
pnpm start           # Uruchomienie serwera prod
```

### Testing & Linting
```bash
pnpm test            # Vitest runner
pnpm lint            # ESLint
pnpm format          # Prettier
pnpm check           # tsc type check
```

### Database
```bash
pnpm db:push         # Migrate database
```

---

## 📝 Podsumowanie Architektury

**AI APK Forge IDE v4** to zaawansowana mobilna aplikacja łącząca:

✅ **Nowoczesny Frontend** - React 19 + React Native + Expo  
✅ **Pełnoprawny Backend** - tRPC + Express + MySQL  
✅ **AI Integration** - OpenAI GPT + Whisper + DALL-E  
✅ **Mobile IDE** - Edytor kodu z syntax highlighting  
✅ **CI/CD Integration** - GitHub Actions automation  
✅ **Bezpieczeństwo** - OAuth 2.0, token management, validation  
✅ **Skalowalna Architektura** - Modułowa, type-safe, testowalna

Cała aplikacja jest napisana w **TypeScript** z ścisłą weryfikacją typów, co zapewnia wysoką jakość kodu i mniejszą liczbę błędów runtime.

---

**Dokument zaktualizowany:** 2026-09-12  
**Wersja:** 1.0  
**Autor:** AI APK Forge Team
