# Stop on first error
$ErrorActionPreference = "Stop"

Write-Host "--- Python Virtual Environment ---"
if (!(Test-Path ".\.venv")) {
    Write-Host "Creating Python virtual environment..."
    python -m venv .venv
}

# Activate the virtual environment
Write-Host "Activating virtual environment..."
& .\.venv\Scripts\Activate.ps1
Write-Host "Virtual environment activated."

# --- Python Dependencies ---
Write-Host "Installing Python dependencies..."
pip install -r backend/requirements.txt

# --- Node.js Dependencies ---
if (Test-Path "package.json") {
    Write-Host "Installing Node.js dependencies..."
    npm install
}

# --- Playwright Dependencies ---
Write-Host "Installing Playwright browser dependencies..."
npx playwright install-deps

# --- Environment File ---
if (!(Test-Path "backend\.env")) {
    Write-Host "Creating .env file..."

    # Generate a new encryption key
    $ENCRYPTION_KEY = python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

    # Create the .env file
    @"
SECRET_KEY=a-secret-key
ENCRYPTION_KEY=$ENCRYPTION_KEY
SQLALCHEMY_DATABASE_URL=sqlite:///./test.db
"@ | Out-File -Encoding utf8 backend\.env
}

# --- Run Application ---
Write-Host "Starting the application..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --env-file backend/.env
