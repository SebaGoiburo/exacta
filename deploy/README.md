# Despliegue en el VPS

El stack vive en `/opt/exacta` y comparte servidor con el middleware de Plex y WireGuard.
El nginx del sistema es la única puerta de entrada. Los contenedores solo escuchan en `127.0.0.1`.

| Archivo | Para qué |
|---|---|
| `docker-compose.yml` | Sitio, n8n y PostgreSQL, con topes de memoria |
| `initdb/10-n8n.sh` | Crea la base y el usuario de n8n la primera vez |
| `nginx/*.conf` | Subdominios del sitio y de n8n. Certbot les agrega HTTPS |
| `n8n/*.json` | Flujos de n8n versionados |
| `backup.sh` | Backup diario de las dos bases y las imágenes. Guarda 7 días |
| `deploy.sh` | Lo ejecuta GitHub Actions para actualizar el sitio |

## Variables de `/opt/exacta/.env`

Cada secreto se genera con `openssl rand -hex 32`. El archivo nunca se versiona.

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SERVER_URL` | URL pública del sitio |
| `PAYLOAD_SECRET` | Secreto |
| `POSTGRES_PASSWORD` | Secreto |
| `N8N_WEBHOOK_SECRET` | Secreto compartido entre el sitio y n8n para firmar eventos |
| `N8N_DOMAIN` | `n8n.exactatransformaciondigital.com` |
| `N8N_ENCRYPTION_KEY` | Secreto. Si se pierde, n8n no puede leer sus credenciales guardadas |
| `N8N_DB_PASSWORD` | Secreto |
| `N8N_VERSION` | Opcional, para fijar otra versión de n8n |
| `GOOGLE_MAPS_API_KEY` | Opcional. Sin ella, Prospección no busca |
| `META_APP_SECRET` | Clave secreta de la app de Meta. Sin ella, se rechaza todo lo que llega de WhatsApp |
| `WHATSAPP_VERIFY_TOKEN` | Texto al azar que se copia en la configuración del webhook en Meta |

Para cargar un secreto sin que se vea en pantalla: `/opt/exacta/set-secret.sh META_APP_SECRET`.

## Flujo de n8n

- `n8n/exacta-events.json` recibe los eventos del sitio y verifica su firma. Sus dos emails quedan
  apagados hasta cargar la credencial SMTP y activar los nodos desde el editor de n8n.
- `n8n/exacta-whatsapp-agent.json` es el agente: recibe los mensajes de Meta, consulta al modelo y responde.
- `n8n/exacta-whatsapp-send.json` envía lo que escribe un asesor desde el panel.
- `n8n/credentials.json` crea las credenciales vacías, sin ningún secreto, para completarlas en el editor.

Para importarlo de nuevo en el servidor, cuando cambie el archivo:

```sh
docker compose cp n8n/exacta-events.json n8n:/tmp/exacta-events.json
docker compose exec n8n n8n import:workflow --input=/tmp/exacta-events.json
docker compose exec n8n n8n publish:workflow --id=exactaEvents00001
docker compose restart n8n
```

## Actualizar el sitio

Cada push a `main` compila la imagen y la despliega. El usuario `exacta` del VPS solo puede
ejecutar `deploy.sh` con la clave que usa GitHub.

## Dominios

- `exactatransformaciondigital.com` es el sitio (`nginx/exacta-main.conf`). `www` redirige ahí.
- `nuevo.exactatransformaciondigital.com` redirige al dominio principal (`nginx/exacta-web.conf`), para que no se rompan los enlaces viejos.
- HTTP/2 está activo en el servidor: la primera línea `listen 443 ssl http2;` de `exacta-main.conf` lo habilita en todo el puerto 443, también para n8n y el middleware de farmacias. Ese bloque HTTPS se administra a mano en el VPS y no está en este repositorio. Los WebSocket de n8n siguen usando HTTP/1.1.
- El webhook de WhatsApp vive en `n8n.exactatransformaciondigital.com`.
- El correo sigue en Hostinger: sus registros `MX`, `TXT` y `CNAME` no apuntan al VPS.
- El sitio solo se indexa si `NEXT_PUBLIC_SERVER_URL` es exactamente el dominio principal.
