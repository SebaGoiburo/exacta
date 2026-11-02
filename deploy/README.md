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

## Flujo de n8n

`n8n/exacta-events.json` recibe los eventos del sitio y verifica su firma. Sus dos emails quedan
apagados hasta cargar la credencial SMTP y activar los nodos desde el editor de n8n.

Para importarlo de nuevo en el servidor, cuando cambie el archivo:

```sh
docker compose cp n8n/exacta-events.json n8n:/tmp/exacta-events.json
docker compose exec n8n n8n import:workflow --input=/tmp/exacta-events.json
```

## Actualizar el sitio

Cada push a `main` compila la imagen y la despliega. El usuario `exacta` del VPS solo puede
ejecutar `deploy.sh` con la clave que usa GitHub.

## Pasar al dominio principal

1. Agregar `exactatransformaciondigital.com` y `www` a `nginx/exacta-web.conf` y correr certbot.
2. Cambiar `NEXT_PUBLIC_SERVER_URL` y recrear el contenedor `web`.
3. Apuntar los registros `@` y `www` del DNS al VPS, sin tocar los de correo.
