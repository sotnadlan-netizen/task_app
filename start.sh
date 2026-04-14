#!/bin/bash
# Start the task app locally

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Start backend
echo "Starting backend on http://localhost:8000 ..."
cd "$ROOT/backend"
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend on http://localhost:3000 ..."
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "App running:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
