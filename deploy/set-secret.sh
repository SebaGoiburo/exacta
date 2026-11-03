#!/bin/sh
# Saves a secret in /opt/exacta/.env without it showing on screen or in the shell history.
# Usage: /opt/exacta/set-secret.sh META_APP_SECRET
set -e
NAME="$1"
FILE=/opt/exacta/.env

case "$NAME" in
  META_APP_SECRET | GOOGLE_MAPS_API_KEY) ;;
  *)
    echo "Usage: $0 META_APP_SECRET|GOOGLE_MAPS_API_KEY"
    exit 1
    ;;
esac

printf 'Pegá el valor de %s y presioná Enter: ' "$NAME"
stty -echo
read -r VALUE
stty echo
echo

if [ -z "$VALUE" ]; then
  echo "No se ingresó ningún valor. No cambió nada."
  exit 1
fi

TMP=$(mktemp "$FILE.XXXXXX")
grep -v "^$NAME=" "$FILE" > "$TMP" || true
printf '%s=%s\n' "$NAME" "$VALUE" >> "$TMP"
chown --reference="$FILE" "$TMP"
chmod --reference="$FILE" "$TMP"
mv "$TMP" "$FILE"

cd /opt/exacta
docker compose up -d web n8n
echo "Listo. $NAME quedó guardado y los servicios se reiniciaron."
