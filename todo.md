# Project TODO

- [x] Przygotować architekturę kontrolowanego Mostu Termuxa i model ochrony sekretów.
- [x] Zdefiniować ekrany, przepływy oraz markę mobilnej aplikacji AI APK Forge.
- [x] Zbudować lokalne modele danych i trwałe ustawienia połączenia.
- [x] Zaimplementować ekran połączenia, formularz nowego zadania i przebieg automatyzacji.
- [x] Zaimplementować plan poleceń, czat naprawy oraz widok pobierania APK.
- [x] Dodać serwerowy moduł AI zwracający ustrukturyzowane, ograniczone plany naprawcze.
- [x] Dodać przykładowy skrypt Mostu Termuxa i instrukcję konfiguracji GitHub Actions.
- [x] Utworzyć dedykowane logo i zaktualizować konfigurację marki aplikacji.
- [x] Dodać testy logiki polityki poleceń oraz przeprowadzić kontrolę typów.
- [x] Zweryfikować składnię Mostu Termuxa, politykę bezpieczeństwa i kontrolę typów projektu.
- [ ] Przetestować połączenie z faktycznym Termuxem oraz pełny przebieg na urządzeniu Android.
- [ ] Utworzyć punkt przywracania i przekazać projekt użytkownikowi.

- [x] Zaimplementować pętlę AI: obserwacja wyniku, analiza, wybór dozwolonej operacji i weryfikacja.
- [x] Dodać limit prób, limit czasu, wykrywanie powtarzających się błędów i bezpieczne zatrzymanie.
- [x] Rozszerzyć Most Termuxa o status workflow, logi etapów, walidację APK i pobieranie artefaktu.
- [x] Dodać do aplikacji tryb automatyczny z widocznym planem, postępem i przyciskiem natychmiastowego zatrzymania.
- [x] Rozszerzyć AI o analizę błędów budowania oraz ustrukturyzowane propozycje poprawek wymagających zgody.
- [x] Dodać testy pętli automatycznej i dokumentację konfiguracji Termuxa dla pracy ciągłej.
- [ ] Przetestować z rzeczywistym Termuxem, GitHub Actions i urządzeniem Android.
- [ ] Utworzyć zaktualizowany punkt przywracania projektu.

- [x] Dodać trwały zapis i odtwarzanie aktywnej sesji automatyzacji po ponownym uruchomieniu aplikacji.
- [x] Dodać watchdog, backoff, ochronę przed duplikacją workflow i odporne ponawianie po utracie połączenia.
- [x] Rozszerzyć Most o wersję protokołu, ping, idempotency key i bezpieczną obsługę przerwanego zadania.
- [x] Zmodernizować ekran przebiegu o postęp, czas, ostatnią obserwację, pause/resume i lepszy dziennik.
- [x] Dodać testy wznowień, retry, timeoutów i deduplikacji.
- [ ] Przeprowadzić końcową kontrolę podglądu i zapisać nową wersję projektu.

- [x] Dodać ustrukturyzowany kontekst diagnostyczny projektu: manifest, wersje narzędzi, git diff i ostatnie kroki.
- [x] Rozszerzyć plan AI o pewność decyzji, warunek sukcesu, ryzyko i wymagane uprawnienia.
- [x] Dodać pamięć przebiegu oraz wykrywanie powtarzających się błędów i nieskutecznych poprawek.
- [x] Wzmocnić protokół Mostu o handshake, heartbeat, numer wersji i kontrolę spójności odpowiedzi.
- [x] Dodać GitHub preflight, identyfikację workflow, gałęzi, commit SHA i świeżości artefaktu APK.
- [x] Dodać testy diagnostyki AI, handshake, świeżości artefaktu i powtarzających się błędów.
- [ ] Zweryfikować podgląd, testy i zapisać nowy punkt przywracania projektu.

- [ ] Dopracować system motywu: tryb jasny/ciemny/systemowy, kontrast i akcent kolorystyczny.
- [ ] Zmodernizować komponenty kart, przycisków, statusów, logów i nawigacji mobilnej.
- [ ] Rozbudować ustawienia automatyzacji: retry, limity, zgody, timeouty i tryb ręczny.
- [ ] Rozbudować ustawienia Termuxa/GitHuba oraz dodać test połączenia i czytelne komunikaty.
- [ ] Dodać ustawienia wyglądu, zachowania logów, powiadomień i prywatności.
- [ ] Zweryfikować wszystkie ekrany na telefonie, uruchomić testy i zapisać nowy punkt przywracania.

## IDE Core v3 — VS Code inspired
- [x] Dodać profesjonalny workspace: Explorer, tabs, dirty state, breadcrumbs i status pliku.
- [x] Dodać Command Palette z operacjami edytora, Termuxa, Git i AI.
- [x] Dodać Go to Line oraz klikalne problemy przenoszące kursor do linii.
- [x] Dodać Outline/Document Symbols z nawigacją do linii.
- [x] Dodać historię undo/redo dla otwartych buforów.
- [x] Dodać projektowe Search z wynikami otwierającymi plik i linię.
- [x] Dodać Git Status i pełny Git Diff jako natywne panele IDE.
- [x] Dodać tworzenie nowych plików tekstowych z poziomu Explorera.
- [x] Dodać AI Quick Fix z kontekstem pliku, zaznaczenia, diagnostyki i Git diff.
- [x] Dodać bezpieczny ekran AI Patch Review przed zastosowaniem diffu.
- [x] Połączyć AI Build Engineer bezpośrednio z Check → Publish → GitHub Actions → logi → diagnoza.
- [ ] Dodać pełne semantyczne LSP/IntelliSense i diagnostykę inline.
- [ ] Dodać rename symbol, references i code actions oparte o indeks projektu.
- [ ] Dodać inline diff, minimapę i wielo-panelowy split editor.
- [ ] Dodać natywny terminal panel oraz streaming logów z długich zadań.
