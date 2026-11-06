# Biuro Rachunkowe Jarosław Konik — pełny podgląd demo

Paczka zawiera gotową stronę główną oraz panel klienta i administratora.
Nie wymaga konta Hostinger, GitHub, kluczy API ani instalowania zależności npm do oglądania.
Potrzebny jest Node.js 24 i przeglądarka na komputerze.

## Uruchomienie

1. Rozpakuj całe archiwum ZIP do jednego folderu.
2. Windows: otwórz START-WINDOWS.cmd. macOS/Linux: uruchom `sh start.sh` w tym folderze.
3. Otwórz http://127.0.0.1:18080 w przeglądarce na tym samym komputerze.
4. Pozostaw okno terminala otwarte. Ctrl+C zatrzymuje portal.

Alternatywnie uruchom `node server.mjs`. Nie otwieraj bezpośrednio site/index.html.
Jeżeli port jest zajęty, nie zatrzymuj nieznanej usługi; ustaw inny PORT dla server.mjs.
Adres 127.0.0.1 działa wyłącznie na urządzeniu, które uruchomiło portal.
Na telefonie użyj istniejącego prywatnego podglądu:
https://portal-firmowy-premium.biuro-paczkow.chatgpt.site

## Co sprawdzić

- Strona główna: styl, nazwa biura, moduły i wejście do strefy klienta.
- /demo: pulpit klienta, dokumenty i szczegóły faktur demonstracyjnych.
- Dokumenty: przycisk „Dodaj przykład” dodaje fikcyjny rekord, nie przesyła pliku.
- Przełącznik Administrator: podgląd obu fikcyjnych firm, zatwierdzanie dokumentów.
- Wiadomości: lokalna rozmowa testowa; zmiana roli pozwala odpowiedzieć jako biuro.
- KSeF i e-ZUS: podgląd makiet, bez komunikacji z urzędami.
- Zwężenie okna przeglądarki: wersja mobilna.

## Granice wersji

Jest to pełna obecna demonstracja interfejsu, a nie produkcyjny system księgowy.
Nie ma prawdziwego uwierzytelniania, izolacji kont, trwałego zapisu, wysyłania wiadomości,
przesyłania dokumentów ani integracji KSeF/ZUS. Przełączenie roli nie nadaje uprawnień.
Odświeżenie strony zeruje zmiany. Nie wpisuj danych klientów ani haseł.
Serwer domyślnie nasłuchuje tylko na 127.0.0.1 i blokuje połączenia strony do zewnętrznych API.
Nie wystawiaj tej wersji publicznie jako portalu produkcyjnego.

## Kod źródłowy

Folder source zawiera kod projektu, zależności z plikiem blokady oraz źródła wersji lokalnej.
Po zainstalowaniu zależności projektu (`npm ci` w source) odbuduj wersję lokalną:

    npx --no-install vite build --config deploy/vps/vite.config.ts
    node --test deploy/vps/server.test.mjs

Wynik znajduje się w source/deploy/vps/site; uruchom source/deploy/vps/server.mjs,
aby obejrzeć przebudowaną wersję. Nie potrzebujesz Cloudflare do tego wariantu lokalnego.
Kod można umieścić w wybranym prywatnym repozytorium GitHub; ta paczka nie publikuje go automatycznie.
Konfiguracja tożsamości istniejącej strony Sites została pominięta w kopii źródeł.

## Opcjonalny Docker

Pliki Dockerfile i compose.yaml służą do uruchomienia demo w kontenerze.
Polecenie `docker compose up --build -d` tworzy kontener i może pobrać obraz Node.
Port pozostaje przypisany do 127.0.0.1:18080. `docker compose down` zatrzymuje demo.
Docker nie jest wymagany do lokalnego podglądu przez Node.js.
