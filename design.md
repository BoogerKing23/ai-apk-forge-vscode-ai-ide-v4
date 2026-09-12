# Projekt interfejsu — AI APK Forge

## Założenie produktu

AI APK Forge prowadzi użytkownika od wskazania katalogu projektu Android do opublikowania kodu w repozytorium GitHub, uruchomienia budowania APK i pobrania gotowego artefaktu. Aplikacja działa w orientacji pionowej 9:16 i stosuje wzorce iOS: duże, czytelne nagłówki, dolny pasek kart, arkusze modalne oraz elementy obsługiwalne kciukiem w dolnej połowie ekranu.

Autonomiczne wykonywanie poleceń w innej aplikacji Android nie jest bezpośrednio dostępne dla zwykłej aplikacji Expo. Dlatego produkt zakłada **opcjonalny lokalny Most Termuxa** uruchomiony przez użytkownika w Termuxie. Most przyjmuje tylko sparowane połączenia na `127.0.0.1`, wykonuje ściśle dopuszczone polecenia i zwraca logi. Aplikacja AI nie może zobaczyć tokenu GitHub ani samodzielnie poszerzyć listy dozwolonych poleceń.

## Lista ekranów

| Ekran | Główna zawartość | Najważniejsze działanie |
| --- | --- | --- |
| Start i połączenie | status GitHub, status Mostu Termuxa, pole klucza parowania, krótka informacja o prywatności | zapisuje ustawienia lokalnie i sprawdza połączenie z mostem |
| Nowe zadanie | pole ścieżki katalogu, nazwa repozytorium, opcja budowania lokalnego lub w GitHub Actions | tworzy sesję automatyzacji po walidacji danych |
| Przebieg zadania | pionowa oś etapów: analiza, Git, publikacja, budowanie, naprawa, pobranie | pokazuje aktywny etap oraz umożliwia zatrzymanie pracy |
| Plan poleceń | grupy poleceń z uzasadnieniem, ryzykiem i oznaczeniem dozwolonej akcji | pozwala zatwierdzić jedno polecenie albo bezpieczny pakiet etapów |
| Czat naprawy AI | skrócony log błędu, odpowiedź AI, proponowana poprawka oraz test weryfikacyjny | wysyła zredagowany log do serwera i tworzy plan naprawczy |
| Artefakt APK | nazwa pliku, źródło budowania, suma kontrolna i czas utworzenia | pobiera APK przez Most Termuxa do katalogu Pobrane i otwiera udział systemowy |
| Ustawienia | adres mostu, klucz parowania, tryb zatwierdzania, instrukcja instalacji mostu i wyczyść dane | resetuje połączenie, dane lokalne i reżim zgód |

## Główne przepływy użytkownika

### Pierwsze uruchomienie

1. Użytkownik widzi ekran połączenia i wpisuje klucz parowania dla lokalnego Mostu Termuxa.
2. Użytkownik podaje token GitHub bezpośrednio mostowi tylko podczas konfiguracji; aplikacja nie przekazuje go do AI ani na zewnętrzny serwer.
3. Aplikacja testuje połączenie lokalne i wyświetla status gotowości GitHub oraz Termuxa.
4. Użytkownik wybiera folder projektu i docelową nazwę repozytorium.

### Publikacja i budowanie

1. Aplikacja prosi AI o ustrukturyzowany plan etapów bez sekretów i bez pełnych logów zawierających poświadczenia.
2. Użytkownik zatwierdza plan albo polecenia w trybie ręcznym; w trybie automatycznym potwierdza wyłącznie wcześniej określony pakiet dozwolonych etapów.
3. Most Termuxa wykonuje poszczególne polecenia, zwraca kod zakończenia oraz ograniczony log.
4. Po `git push` aplikacja wyzwala wybrany scenariusz budowania, monitoruje wynik i pobiera artefakt APK.

### Naprawa niepowodzenia

1. Gdy etap kończy się błędem, aplikacja redaguje log, usuwa wzorce przypominające tokeny i przekazuje tylko konieczny fragment do AI.
2. AI proponuje ograniczoną poprawkę, test i kolejny krok; aplikacja nie wykonuje dowolnego kodu wygenerowanego przez AI.
3. Poprawka wymaga zgody użytkownika, chyba że mieści się w aktywnie zatwierdzonym pakiecie.
4. Przebieg powtarza się do osiągnięcia artefaktu, zatrzymania przez użytkownika lub limitu prób.

## Reguły bezpieczeństwa

| Obszar | Reguła interfejsu i wykonania |
| --- | --- |
| Token GitHub | zapis wyłącznie w bezpiecznym magazynie mostu; UI nigdy nie pokazuje pełnej wartości po zapisaniu |
| Klucz AI | aplikacja używa serwerowego asystenta i nie wymaga udostępnienia klucza AI; pole „klucz API” jest rozumiane jako klucz parowania mostu lub token GitHub |
| Termux | most nasłuchuje jedynie na lokalnym adresie i wymaga losowego klucza w nagłówku żądania |
| Polecenia | AI przekazuje intencję i plan; polityka mostu odrzuca polecenia destrukcyjne, pobieranie niezatwierdzonych skryptów oraz wyjście poza katalog projektu |
| Automatyczne naprawy | domyślnie wyłączone; użytkownik może włączyć wyłącznie powtarzanie wcześniej zatwierdzonych etapów |
| Logi | tokeny, hasła i długie klucze są maskowane przed wyświetleniem oraz przed wysłaniem do AI |

## Kolory i styl

| Element | Kolor | Zastosowanie |
| --- | --- | --- |
| Tło główne | `#09111F` | głęboki granat przypominający konsolę, ale zachowujący kontrast i czytelność |
| Powierzchnia kart | `#13233A` | karty statusów, etapy automatyzacji i logi |
| Akcent podstawowy | `#56E0C0` | przyciski główne, poprawny przebieg, aktywny etap |
| Akcent pomocniczy | `#6FA8FF` | informacje, odsyłacze i elementy GitHub |
| Ostrzeżenie | `#F2B24B` | wymagane zgody i oczekiwanie na budowanie |
| Błąd | `#FF718B` | nieudane kroki i zatrzymane zadania |
| Tekst główny | `#F4F7FB` | nagłówki i wartości kluczowe |
| Tekst wtórny | `#A9B8CC` | opisy, metadane i pomoc kontekstowa |

Komponenty mają zaokrąglenie 16–22 px, duże strefy dotyku co najmniej 44 px i wyróżnione stany sukcesu, oczekiwania oraz błędu. Monospace jest używany wyłącznie dla ścieżek, poleceń i logów, natomiast reszta interfejsu zachowuje natywną typografię systemową.

## IDE Core v3

Edytor przechodzi z prostego pola tekstowego w mobilny workspace inspirowany architekturą VS Code. Główne powierzchnie są połączone jednym stanem sesji: Explorer i tabs reprezentują workspace, editor jest źródłem bieżącego kontekstu, Problems/Search/Diff pokazują dowody, a AI Build Engineer wykonuje kontrolowaną pętlę weryfikacyjną.

Nowe elementy: Command Palette, breadcrumbs, Outline/Symbols, Go to Line, undo/redo, Search z nawigacją do linii, Git Status/Diff, tworzenie plików, Patch Review oraz AI Quick Fix. Most Termuxa zachowuje politykę allowlisty i udostępnia osobne operacje `git_status` i `git_diff`, dzięki czemu model diagnostyczny otrzymuje faktyczny stan repozytorium bez dostępu do arbitralnej powłoki.

Docelowy kierunek: lekki indeks projektu i LSP/IntelliSense, semantyczne Code Actions/Rename/References, inline diagnostics, split editor oraz streaming terminala. Warstwa AI ma pozostać dowodowa: każda automatyczna poprawka powinna być związana z konkretnym problemem i świeżą weryfikacją builda.
