#!/usr/bin/env sh
set -eu
cd -- "$(dirname -- "$0")"
echo 'Otwórz http://127.0.0.1:18080 w przeglądarce. Zatrzymanie: Ctrl+C.'
HOST=127.0.0.1 PORT=18080 exec node server.mjs
