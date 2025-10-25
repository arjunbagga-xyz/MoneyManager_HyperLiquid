# Stop on first error
$ErrorActionPreference = "Stop"

# --- Helper Functions ---
function Print-Header($title) {
    Write-Host ""
    Write-Host "--- $title ---"
}

# --- Prerequisite Checks ---
Print-Header "Checking Prerequisites"
$pythonExists = (Get-Command python -ErrorAction SilentlyContinue)
if (-not $pythonExists) {
    Write-Host "Python is not installed. Aborting."
    exit 1
}
Write-Host "Python found."

$npmExists = (Get-Command npm -ErrorAction SilentlyContinue)
if (-not $npmExists) {
    Write-Host "Node.js or npm is not installed. Aborting."
    exit 1
}
Write-Host "Node.js and npm found."

# --- Python Virtual Environment ---
Print-Header "Setting up Python Virtual Environment"
if (-not (Test-Path ".\.venv")) {
    Write-Host "Creating Python virtual environment..."
    python -m venv .venv
} else {
    Write-Host "Virtual environment already exists."
}

# Activate the virtual environment
Write-Host "Activating virtual environment..."
& .\.venv\Scripts\Activate.ps1
Write-Host "Virtual environment activated."

# --- Python Dependencies ---
Print-Header "Installing Python Dependencies"
pip install -r backend/requirements.txt

# --- Node.js Dependencies ---
Print-Header "Installing Node.js Dependencies"
if (Test-Path "package.json") {
    if (Test-Path "package-lock.json") {
        Write-Host "Installing Node.js dependencies with npm ci..."
        npm ci
    } else {
        Write-Host "Installing Node.js dependencies with npm install..."
        npm install
    }
} else {
    Write-Host "package.json not found, skipping Node.js dependencies."
}


# --- Playwright Dependencies ---
Print-Header "Installing Playwright Dependencies"
npx playwright install-deps

# --- Environment File ---
Print-Header "Setting up Environment File"
if (-not (Test-Path "backend\.env")) {
    Write-Host "Creating .env file with default values..."
    $ENCRYPTION_KEY = python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    @"
secret_key=a-secret-key
encryption_key=$ENCRYPTION_KEY
sqlalchemy_database_url=sqlite:///./test.db
"@ | Out-File -Encoding utf8NoBOM backend\.env
} else {
    Write-Host ".env file already exists."
}

# --- Run Application ---
Print-Header "Running the Application"
Write-Host "Starting Uvicorn server in the background..."
$command = "uvicorn backend.main:app --host 0.0.0.0 --port 8000 --env-file backend/.env"
$process = Start-Process "powershell" -ArgumentList "-NoExit", "-Command", $command -PassThru
Write-Host "Server started with PID: $($process.Id)"
Write-Host "A new PowerShell window has been opened for the server."
Write-Host "To stop the server, close the new PowerShell window or run: Stop-Process -Id $($process.Id)"

Write-Host ""
Write-Host "Setup complete! The backend server is running."
