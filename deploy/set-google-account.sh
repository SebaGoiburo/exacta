#!/bin/sh
# Saves the Google service account in /opt/exacta/.env without leaving it on screen or in the shell history.
# Usage: /opt/exacta/set-google-account.sh, paste the whole JSON file, then press Ctrl+D on an empty line.
set -e
FILE=/opt/exacta/.env

echo 'Pegá el contenido completo del archivo JSON. Después presioná Enter y Ctrl+D:'
stty -echo
JSON=$(cat)
stty echo
echo

case "$JSON" in
  *client_email*private_key* | *private_key*client_email*) ;;
  *)
    echo "Eso no parece el archivo de una cuenta de servicio. No cambió nada."
    exit 1
    ;;
esac

ENCODED=$(printf '%s' "$JSON" | base64 -w0)
TMP=$(mktemp "$FILE.XXXXXX")
grep -v '^GOOGLE_SERVICE_ACCOUNT_B64=' "$FILE" > "$TMP" || true
printf 'GOOGLE_SERVICE_ACCOUNT_B64=%s\n' "$ENCODED" >> "$TMP"
chown --reference="$FILE" "$TMP"
chmod --reference="$FILE" "$TMP"
mv "$TMP" "$FILE"

cd /opt/exacta
docker compose up -d web
echo "Listo. La cuenta quedó guardada y el sitio se reinició."
