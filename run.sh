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
    # Generate a new encryption key
    ENCRYPTION_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

    # Create the .env file
    cat > backend/.env << EOF
SECRET_KEY=a-secret-key
ENCRYPTION_KEY=${ENCRYPTION_KEY}
SQLALCHEMY_DATABASE_URL=sqlite:///./test.db
EOF
fi

# --- Run Application ---
echo "Starting the application..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --env-file backend/.env
