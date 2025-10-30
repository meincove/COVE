import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

USE_SQLITE = os.getenv("USE_SQLITE", "0") == "1"

if USE_SQLITE:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("PGDATABASE"),
            "USER": os.getenv("PGUSER"),
            "PASSWORD": os.getenv("PGPASSWORD"),
            "HOST": os.getenv("PGHOST"),
            "PORT": os.getenv("PGPORT", "5432"),
            "OPTIONS": {"sslmode": "require"},
        }
    }
    
# --- apps (make sure these two are present) ---
INSTALLED_APPS = [
    # existing django + your apps...
    "corsheaders",
    "tools",
]

# --- middleware (cors at the top) ---
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    # existing middleware…
]

# --- CORS (dev) ---
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Next.js
    "http://localhost:8080",  # AI Core
]    