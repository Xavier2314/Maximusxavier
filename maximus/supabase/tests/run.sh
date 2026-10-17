#!/usr/bin/env bash
# Applies all migrations to a throwaway local PostgreSQL database and runs the
# security test-suite. Requires a local PostgreSQL server (no Supabase needed).
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB="${MAXIMUS_TEST_DB:-maximus_test}"
PSQL="${PSQL:-psql}"
dropdb --if-exists "$DB" && createdb "$DB"
cat "$DIR/tests/00_supabase_stub.sql" "$DIR"/migrations/*.sql "$DIR/tests/01_security_tests.sql" > /tmp/maximus_all.sql
$PSQL -v ON_ERROR_STOP=1 -q -d "$DB" -f /tmp/maximus_all.sql
