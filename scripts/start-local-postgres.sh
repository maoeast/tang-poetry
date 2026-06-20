#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PG_BIN_DIR="/usr/lib/postgresql/16/bin"
PGDATA_DIR="$ROOT_DIR/.local-postgres/data"
PGLOG_DIR="$ROOT_DIR/.local-postgres/log"
PGSOCKET_DIR="$ROOT_DIR/.local-postgres/run"
PGUSER="${PGUSER:-dev}"
PGPASSWORD_VALUE="${PGPASSWORD_VALUE:-devpassword}"
PGDATABASE_NAME="${PGDATABASE_NAME:-tang_poetry}"

mkdir -p "$PGLOG_DIR" "$PGSOCKET_DIR"

if [[ ! -d "$PGDATA_DIR/base" ]]; then
  mkdir -p "$PGDATA_DIR"
  "$PG_BIN_DIR/initdb" -D "$PGDATA_DIR" -U "$PGUSER" --pwfile=<(printf '%s' "$PGPASSWORD_VALUE") >/dev/null
fi

sed -i "/^listen_addresses = /d" "$PGDATA_DIR/postgresql.conf"
sed -i "/^port = /d" "$PGDATA_DIR/postgresql.conf"
sed -i "/^unix_socket_directories = /d" "$PGDATA_DIR/postgresql.conf"
{
  echo "listen_addresses = ''"
  echo "unix_socket_directories = '$PGSOCKET_DIR'"
} >> "$PGDATA_DIR/postgresql.conf"

"$PG_BIN_DIR/pg_ctl" -D "$PGDATA_DIR" -l "$PGLOG_DIR/postgres.log" start >/dev/null

export PGPASSWORD="$PGPASSWORD_VALUE"
if ! "$PG_BIN_DIR/psql" -h "$PGSOCKET_DIR" -U "$PGUSER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$PGDATABASE_NAME'" | grep -q 1; then
  "$PG_BIN_DIR/createdb" -h "$PGSOCKET_DIR" -U "$PGUSER" "$PGDATABASE_NAME"
fi

echo "Local PostgreSQL is running on socket $PGSOCKET_DIR"
