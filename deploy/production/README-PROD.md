# Wdrożenie produkcyjne: Portal.biuroadmin.online

Nowa, dedykowana architektura produkcyjna oparta na kontenerach Docker, odizolowana od wcześniejszych serwerów współdzielonych.

## Komponenty stosu
1. **portal-web:** Frontend i API aplikacji (`Node.js 22+ / Next.js / Vite`).
2. **ksef-worker:** Proces roboczy wzorca Outbox (`Node.js / TypeScript`), asynchronicznie przesyłający faktury do KSeF.
3. **postgres:** Baza danych PostgreSQL 16 (inicjalizacja schematu z `init-db.sql`, indeksy unikalności A06).
4. **redis:** Pamięć podręczna, klucze idempotencji `SETNX` oraz bezpiecznik Circuit Breaker.
5. **rabbitmq:** Broker komunikatów RabbitMQ z panelem zarządzania i obsługą Dead Letter Queue (DLQ).
6. **caddy:** Reverse proxy z automatycznym provisionowaniem certyfikatów Let's Encrypt SSL/TLS.

## Uruchomienie na nowym serwerze
```bash
# 1. Przejdź do katalogu wdrożeniowego
cd deploy/production

# 2. Skonfiguruj zmienne środowiskowe
cp .env.production.example .env

# 3. Uruchom stos w tle
docker compose up -d --build

# 4. Sprawdź status kontenerów
docker compose ps
docker compose logs -f portal-web
```
