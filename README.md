# Portal Biuro Admin Online

Oficjalne repozytorium portalu klienta dla **Biura Rachunkowego Jarosław Konik** ([portal.biuroadmin.online](https://portal.biuroadmin.online)).

## Architektura i wdrożenie

* **Technologia:** Next.js / React 19 / TypeScript / Vite / Tailwind CSS
* **Hosting:** GitHub Pages z automatycznym CI/CD przez GitHub Actions ([.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml))
* **Domena produkcyjna:** `portal.biuroadmin.online`

## Uruchomienie lokalne

```bash
# Instalacja zależności
npm ci

# Uruchomienie deweloperskie Vite
npm run dev

# Zbudowanie wersji produkcyjnej portalu
npx vite build --config deploy/vps/vite.config.ts
```

## Ciągłe wdrażanie (CI/CD)

Każdy push do gałęzi `main` automatycznie buduje i publikuje portal na GitHub Pages za pośrednictwem dedykowanego workflow GitHub Actions.
