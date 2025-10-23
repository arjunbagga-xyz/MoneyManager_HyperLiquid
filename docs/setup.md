# Setup Guide

This guide provides instructions on how to set up the trading platform for local development.

## Prerequisites

-   Python 3.10+
-   PostgreSQL

## Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```

2.  **Create a virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

3.  **Install the dependencies:**
    ```bash
    pip install -r backend/requirements.txt
    ```

## Configuration

1.  **Set up the PostgreSQL database:**
    -   Create a new PostgreSQL database.
    -   Create a new user and grant them privileges to the database.

2.  **Create a `.env` file:**
    -   In the root of the project, create a file named `.env`.
    -   Add the following environment variables to the file, replacing the placeholder values with your own:
        ```
        DATABASE_URL=postgresql://user:password@host:port/database_name
        SECRET_KEY=your_secret_key
        ALGORITHM=HS256
        ACCESS_TOKEN_EXPIRE_MINUTES=30
        ```

## Running the Application

1.  **Start the backend server:**
    ```bash
    uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
    ```

2.  **Open the frontend:**
    -   Open the `frontend/index.html` file in your web browser.
