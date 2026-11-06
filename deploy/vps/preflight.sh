#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
printf '%s\n' 'Kontrola bez zmian na serwerze — demo Biura Rachunkowego Jarosław Konik'
command -v docker >/dev/null || { echo 'Brak Docker. Nic nie instaluję.'; exit 1; }
command -v ss >/dev/null || { echo 'Brak ss. Sprawdzenie portu wymaga administratora.'; exit 1; }
docker compose version
version=$(docker version --format '{{.Server.Version}}')
major=${version%%.*}
[[ "$major" =~ ^[0-9]+$ ]] && ((major>=28)) || { echo 'Wymagany Docker Engine 28+ ze względu na izolację portów localhost.'; exit 1; }
docker compose config --quiet
test -s site/index.html && test -s server.mjs
if [[ -n "$(ss -H -ltn 'sport = :18080')" ]]; then echo 'Port 18080 jest zajęty. Nic nie zatrzymuję.'; exit 1; fi
if [[ -n "$(docker ps -aq --filter label=com.docker.compose.project=konik-portal-demo)" ]]; then echo 'Projekt konik-portal-demo już istnieje. Wymagana ocena administratora, bez nadpisania.'; exit 1; fi
df -h .
echo 'Kontrola zakończona. Nie uruchomiono ani nie zmieniono usług.'
