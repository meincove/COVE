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
    "rest_framework",
    "tools",       # existing catalog app
]

# --- middleware (cors at the top) ---
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    # existing middleware…
]

# --- CORS (dev) ---
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Next.js
    "http://localhost:8080",  # AI Core,
    "http://127.0.0.1:3000",
    "http://localhost:3000",
]    

# If you’ll send cookies (session/auth) from frontend:
CORS_ALLOW_CREDENTIALS = True

# CSRF (required if you post with cookies or session auth)
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

# ---- Dev toggles ----
DEBUG = os.getenv("DEBUG", "1") == "1"

# Allow localhost in dev
if DEBUG:
    ALLOWED_HOSTS = ["127.0.0.1", "localhost"]
else:
    # keep whatever you had for prod; example:
    ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",") if os.getenv("ALLOWED_HOSTS") else []

# MIDDLEWARE order: corsheaders should be as high as possible
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    # …then the rest (CommonMiddleware should still be present)
    "django.middleware.common.CommonMiddleware",
    # ...
]
APPEND_SLASH = False