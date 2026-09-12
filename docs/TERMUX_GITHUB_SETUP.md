# Połączenie AI APK Forge z Termuxem i GitHubem

## Cel integracji

Aplikacja mobilna nie uruchamia poleceń powłoki bezpośrednio. Korzysta z lokalnego Mostu Termuxa, działającego wyłącznie na tym samym telefonie. Most posiada token parowania, przechowuje poświadczenie GitHub poza interfejsem AI i obsługuje wyłącznie zdefiniowane operacje na wybranym katalogu projektu.

## Wymagania w Termuxie

W Termuxie należy zainstalować narzędzia oraz skonfigurować dostęp do katalogu Pobrane. Polecenia należy uruchomić ręcznie, w tej kolejności.

```bash
pkg update -y && pkg upgrade -y
pkg install -y nodejs git gh openjdk-21
termux-setup-storage
gh auth login
```

Podczas `gh auth login` należy wybrać GitHub.com, HTTPS i zalogować się do własnego konta. Token pozostaje w konfiguracji GitHub CLI w Termuxie; nie należy wklejać go do czatu AI ani do pola połączenia w aplikacji.

## Uruchomienie Mostu Termuxa

Skopiuj plik `termux/termux-bridge.mjs` do katalogu domowego Termuxa. Wygeneruj długi losowy klucz, ustaw go jako zmienną i uruchom most.

```bash
mkdir -p ~/.ai-apk-forge
cp /ścieżka/do/termux-bridge.mjs ~/.ai-apk-forge/
export AI_APK_FORGE_BRIDGE_KEY="wklej-tu-własny-długi-losowy-klucz"
node ~/.ai-apk-forge/termux-bridge.mjs
```

W aplikacji wpisz adres `http://127.0.0.1:46321` oraz ten sam klucz parowania. Aplikacja zapisze klucz tylko w bezpiecznym magazynie systemowym telefonu, a na ekranie pokaże wyłącznie maskowaną wartość.

> Most celowo nie akceptuje przesłanego tekstu powłoki. Aplikacja wysyła jedynie nazwę zdefiniowanej operacji oraz dane wejściowe, a most rozdziela argumenty bez `shell: true`.

## Katalog projektu

Podawaj ścieżkę widoczną dla Termuxa, na przykład `/data/data/com.termux/files/home/projekty/moja-aplikacja`. Katalog musi należeć do katalogu domowego Termuxa. Most odrzuca ścieżki wychodzące poza ten obszar oraz dowiązania symboliczne poza katalogiem projektu.

## Budowanie na GitHub Actions

Do projektu Android dodaj plik `.github/workflows/android-apk.yml` na podstawie szablonu `github/android-apk.yml` dołączonego do tego projektu. Zanim uruchomisz pierwsze budowanie, dopasuj w nim wersję Java oraz nazwę modułu i pliku APK do własnego projektu.

Po publikacji kodu GitHub Actions buduje artefakt `apk-release`. Most może sprawdzić ostatni przebieg, pobrać artefakt do `~/storage/downloads/AI-APK-Forge` i przekazać aplikacji pełną ścieżkę pliku.

## Granice i zalecenia

| Funkcja | Co robi | Wymagane działanie użytkownika |
| --- | --- | --- |
| Analiza projektu | odczytuje ograniczoną listę plików i status Git | zatwierdzenie pierwszego planu |
| Publikacja GitHub | wykonuje zdefiniowane operacje Git i GitHub CLI | wcześniejsze `gh auth login` w Termuxie |
| Budowanie APK | rozpoczyna lub monitoruje GitHub Actions | workflow w repozytorium |
| Naprawa błędu | AI proponuje ustrukturyzowaną operację i uzasadnienie | akceptacja poprawki, jeśli nie mieści się w aktywnym pakiecie zgód |
| Pobieranie | zapisuje artefakt do katalogu Pobrane | zgoda na operację pobrania |

Automatyczne poprawki powinny pozostać wyłączone dla obcych lub nieprzejrzanych projektów. Nie wolno używać mostu z adresem sieciowym dostępnym dla innych urządzeń ani otwierać portu 46321 w sieci lokalnej.

## Pętla automatyczna AI

Na ekranie „Przebieg” przycisk „Uruchom pętlę AI” wykonuje kolejno analizę katalogu, publikację, start workflow, cykliczne sprawdzanie statusu oraz pobranie i walidację APK. Podczas oczekiwania na GitHub Actions aplikacja nie wysyła nowych niekontrolowanych poleceń; odczytuje tylko status i podsumowanie zadań workflow.

Pętla ma dwa twarde bezpieczniki: maksymalnie 20 prób oraz 10 minut pracy. Każda próba zwiększa licznik i jest zapisywana w dzienniku. Użytkownik może w dowolnym momencie nacisnąć „Zatrzymaj natychmiast”; aplikacja przerywa lokalną pętlę i wysyła do GitHub Actions operację anulowania, jeśli posiada identyfikator workflow.

Jeżeli budowanie zakończy się błędem, zredagowany log trafia do asystenta AI. Asystent zwraca diagnozę, następny dozwolony etap oraz opcjonalny mały diff. Domyślnie diff wymaga zgody w zakładce „Naprawa AI”. Włączenie „Automatycznych poprawek kodu” jest osobną decyzją użytkownika i nadal podlega walidacji ścieżek oraz blokadzie plików z sekretami przez Most.

Pętla uznaje sukces dopiero po znalezieniu nowego przebiegu zakończonego powodzeniem, pobraniu artefaktu oraz sprawdzeniu nagłówka i rozmiaru pliku APK. Jeśli workflow wisi, generuje powtarzające się błędy albo przekracza limit czasu, aplikacja zatrzymuje się i pozostawia użytkownikowi pełny dziennik ostatniej obserwacji.


## Wbudowany edytor kodu w stylu VS Code

Zakładka **Kod** działa bezpośrednio na katalogu projektu w Termuxie. Dostępne są: Explorer plików, filtr katalogów, wyszukiwanie tekstu, karta aktualnego pliku, numery linii, edycja monospacowa, zapis do projektu oraz pasek stanu z językiem i numerem linii. Edytor komunikuje się wyłącznie z dozwolonymi operacjami Mostu — nie wykonuje surowych komend powłoki.

Edytor celowo blokuje pliki sekretów i pliki binarne. Zapis wymaga jawnego potwierdzenia po stronie aplikacji. Po zapisaniu pliku albo zastosowaniu diffu wcześniejsze wyniki publikacji/builda są automatycznie unieważniane, więc kolejny przebieg nie może omyłkowo uznać starego APK za aktualne.

## AI z pełniejszym kontekstem projektu

Przycisk analizy AI najpierw odświeża diagnostykę projektu przez `inspect`. Jeżeli sesja ma identyfikator GitHub Actions, pobierany jest również status workflow oraz logi nieudanych zadań. Do modelu trafiają ponadto bieżący plik i bufor z wbudowanego edytora, historia skrótów błędów oraz żądanie użytkownika.

AI nie otrzymuje tokenów GitHub ani kluczy Mostu. Model proponuje minimalny diff, a Most ponownie waliduje zakres plików przed zastosowaniem. Po zmianie kodu automatyzacja musi wykonać świeżą publikację i świeży build.

> To zwiększa skuteczność diagnostyki, ale nie jest gwarancją „zero błędów”. Poprawny wynik nadal zależy od samego projektu, zależności, konfiguracji Androida i środowiska GitHub Actions.
