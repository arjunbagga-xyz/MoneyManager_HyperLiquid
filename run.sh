#!/bin/bash
set -e

# --- Helper Functions ---
print_header() {
    echo
    echo "--- $1 ---"
}

# --- Prerequisite Checks ---
print_header "Checking Prerequisites"
command -v python3 >/dev/null 2>&1 || { echo >&2 "Python 3 is not installed. Aborting."; exit 1; }
echo "Python 3 found."
command -v npm >/dev/null 2>&1 || { echo >&2 "Node.js or npm is not installed. Aborting."; exit 1; }
echo "Node.js and npm found."

# --- Python Virtual Environment ---
print_header "Setting up Python Virtual Environment"
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
else
    echo "Virtual environment already exists."
fi

source .venv/bin/activate
echo "Virtual environment activated."

# --- Python Dependencies ---
print_header "Installing Python Dependencies"
pip install -r backend/requirements.txt

# --- Node.js Dependencies ---
print_header "Installing Node.js Dependencies"
if [ -f "package.json" ]; then
    if [ -f "package-lock.json" ]; then
        echo "Installing Node.js dependencies with npm ci..."
        npm ci
    else
        echo "Installing Node.js dependencies with npm install..."
        npm install
    fi
else
    echo "package.json not found, skipping Node.js dependencies."
fi

# --- Playwright Dependencies ---
print_header "Installing Playwright Dependencies"
npx playwright install-deps

# --- Environment File ---
print_header "Setting up Environment File"
if [ ! -f "backend/.env" ]; then
    echo "Creating .env file with default values..."
    ENCRYPTION_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
    cat > backend/.env << EOF
SECRET_KEY=a-secret-key
ENCRYPTION_KEY=${ENCRYPTION_KEY}
SQLALCHEMY_DATABASE_URL=sqlite:///./test.db
EOF
else
    echo ".env file already exists."
fi

# --- Run Application ---
print_header "Running the Application"
echo "Starting Uvicorn server in the background..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --env-file backend/.env > backend.log 2>&1 &
SERVER_PID=$!
echo "Server started with PID: $SERVER_PID"
echo "You can view the logs with: tail -f backend.log"
echo "To stop the server, run: kill $SERVER_PID"

echo
echo "Setup complete! The backend server is running."
