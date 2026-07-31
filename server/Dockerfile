# Build context is the repo root (see docker-compose.yml).
FROM python:3.11-slim

WORKDIR /app

COPY server/requirements.txt server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt

# Copy the modular app package
COPY server/app server/app

# Copy cv_data from the canonical data/ directory
COPY data/cv_data.json data/cv_data.json

WORKDIR /app/server

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
