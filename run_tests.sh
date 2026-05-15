#!/usr/bin/env bash
# HireAxis Regression Test Runner
# Usage: ./run_tests.sh [backend|frontend|all]
#
# Prerequisites:
#   - Frontend dev server running on http://localhost:3000 (npm run dev)
#   - Backend running on http://localhost:8000 (uvicorn main:app --reload)

set -e
SCOPE="${1:-all}"
ROOT="$(cd "$(dirname "$0")" && pwd)"
PASS=0; FAIL=0

header() { echo; echo "═══════════════════════════════════════════════"; echo "  $1"; echo "═══════════════════════════════════════════════"; }

# ── Backend tests ─────────────────────────────────────────────────────────────
run_backend() {
  header "BACKEND — pytest (http://localhost:8000)"
  cd "$ROOT/backend"
  if python3 -m pytest tests/ -v --tb=short 2>&1; then
    PASS=$((PASS+1))
  else
    FAIL=$((FAIL+1))
  fi
}

# ── Frontend E2E tests ────────────────────────────────────────────────────────
run_frontend() {
  header "FRONTEND E2E — Playwright (http://localhost:3000)"
  cd "$ROOT/frontend"
  if npx playwright test 2>&1; then
    PASS=$((PASS+1))
  else
    FAIL=$((FAIL+1))
  fi
}

# ── Run ───────────────────────────────────────────────────────────────────────
case "$SCOPE" in
  backend)  run_backend ;;
  frontend) run_frontend ;;
  all)      run_backend; run_frontend ;;
  *)        echo "Usage: $0 [backend|frontend|all]"; exit 1 ;;
esac

header "RESULTS"
echo "  Suites passed : $PASS"
echo "  Suites failed : $FAIL"
[ "$FAIL" -eq 0 ] && echo "  ✓ All tests passed" || { echo "  ✗ Some tests failed"; exit 1; }
