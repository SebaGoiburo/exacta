#!/bin/sh
# Creates the n8n database and its own user, kept apart from the site's data.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<SQL
CREATE USER n8n WITH PASSWORD '$N8N_DB_PASSWORD';
CREATE DATABASE n8n OWNER n8n;
SQL
