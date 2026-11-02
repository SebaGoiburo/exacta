#!/bin/sh
# Run by GitHub Actions through a forced SSH command: this is all that key can do.
set -e
cd /opt/exacta
docker compose pull web
docker compose up -d web
docker image prune -f
