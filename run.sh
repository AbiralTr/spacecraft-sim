#!/usr/bin/env bash
# Runs backend (FastAPI) and frontend (Vite) together. Ctrl+C stops both.
set -e

cd "$(dirname "$0")"

(cd backend && source venv/bin/activate && uvicorn app:app --reload) &
BACKEND_PID=$!

(cd frontend && npm run dev) &
FRONTEND_PID=$!

trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null' EXIT INT TERM

wait
