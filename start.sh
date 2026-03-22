#!/bin/bash

echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║       8Class Chauffeurs — Prototype Suite        ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""

# Kill any existing processes on ports
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Start Backend
echo "  [1/2] Starting Backend API on port 3001..."
cd backend && node server.js &
BACKEND_PID=$!
sleep 2

# Start Web Portal
echo "  [2/2] Starting Web Portal on port 3000..."
cd ../web-portal && npx next dev -p 3000 &
WEB_PID=$!

echo ""
echo "  ═══════════════════════════════════════════════════"
echo ""
echo "  ✓ Backend API:    http://localhost:3001"
echo "  ✓ Web Portal:     http://localhost:3000"
echo ""
echo "  ── Login Credentials ──"
echo "  Web Portal:   admin / admin123"
echo "  Driver App:   james@8class.com → OTP: 12345"
echo "  Customer App: richard@example.com → OTP: 12345"
echo ""
echo "  ── Mobile Apps ──"
echo "  cd driver-app && npx expo start"
echo "  cd customer-app && npx expo start"
echo ""
echo "  Press Ctrl+C to stop all services"
echo ""

# Wait and cleanup
trap "kill $BACKEND_PID $WEB_PID 2>/dev/null; echo 'Stopped all services.'" EXIT
wait
