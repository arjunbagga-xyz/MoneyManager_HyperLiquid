#!/bin/bash
set -e

# --- Python Virtual Environment ---
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate
echo "Virtual environment activated."

# --- Python Dependencies ---
echo "Installing Python dependencies..."
pip install -r backend/requirements.txt

# --- Node.js Dependencies ---
if [ -f "package.json" ]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

# --- Playwright Dependencies ---
echo "Installing Playwright browser dependencies..."
npx playwright install-deps

# --- Environment File ---
if [ ! -f "backend/.env" ]; then
    echo "Creating .env file..."
    python setup_env.py
fi

# --- Run Application ---
echo "Starting the application..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --env-file backend/.env
