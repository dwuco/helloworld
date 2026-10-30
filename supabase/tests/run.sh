#!/usr/bin/env bash
# Applies the migration to a throwaway database and runs the RLS checks.
# Usage: PSQL="psql -h localhost -U postgres" supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")"
PSQL=${PSQL:-psql}
export PGOPTIONS="-c client_min_messages=warning"
DB=pantryiq_rls_test
$PSQL -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
$PSQL -v ON_ERROR_STOP=1 -q -d $DB -f supabase-stub.sql
$PSQL -v ON_ERROR_STOP=1 -q -d $DB -f ../migrations/0001_pantryiq_init.sql
# Applying twice proves the migration is re-runnable.
$PSQL -v ON_ERROR_STOP=1 -q -d $DB -f ../migrations/0001_pantryiq_init.sql
$PSQL -v ON_ERROR_STOP=1 -q -d $DB -f rls-test.sql
$PSQL -q -d postgres -c "drop database $DB"
