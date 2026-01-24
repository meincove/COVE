FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Default port (Railway will override via PORT env var)
ENV PORT=8000

# Use shell form so $PORT gets expanded
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
