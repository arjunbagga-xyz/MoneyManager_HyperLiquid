# Setup and Installation Guide

This guide provides step-by-step instructions for setting up the development environment for the trading platform.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

-   **Python 3.10+**
-   **PostgreSQL**
-   **Git**

## 1. Clone the Repository

First, clone the project repository from your version control system:

```bash
git clone <your-repository-url>
cd <project-directory>
```

## 2. Backend Setup

### Create a Virtual Environment

It is highly recommended to use a Python virtual environment to manage the project's dependencies.

```bash
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
```

### Install Dependencies

The backend dependencies are listed in the `requirements.txt` file. Install them using pip:

```bash
pip install -r backend/requirements.txt
```

### Configure Environment Variables

The application uses a `.env` file to manage sensitive configuration, such as database credentials and secret keys. Create a `.env` file in the root of the project directory and add the following variables:

```
SQLALCHEMY_DATABASE_URL=postgresql://<user>:<password>@<host>/<dbname>
SECRET_KEY=<your-jwt-secret-key>
ENCRYPTION_KEY=<your-fernet-encryption-key>
```

**Note:** You can generate a new Fernet encryption key using the `cryptography` library.

### Set Up the Database

Ensure your PostgreSQL server is running. Then, connect to it and create the database you specified in the `SQLALCHEMY_DATABASE_URL`.

### Run the Backend Server

Once the setup is complete, you can run the backend server using `uvicorn`:

```bash
uvicorn backend.main:app --reload
```

The server will be available at `http://127.0.0.1:8000`. You can access the automatic API documentation at `http://127.0.0.1:8000/docs`.

## 3. Frontend Setup

The frontend is a simple static website. To view it, you can open the HTML files directly in your browser. For a better development experience, you can use a simple HTTP server.

### Running with a Simple HTTP Server

If you have Python installed, you can use its built-in HTTP server. Navigate to the `frontend` directory and run:

```bash
cd frontend
python -m http.server
```

The frontend will be available at `http://localhost:8000`.
