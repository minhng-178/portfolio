# Build context is the repo root (see docker-compose.yml), so this image can
# also copy cv_data.json which main.py reads from its parent directory.
FROM python:3.11-slim

WORKDIR /app

COPY chatbot/requirements.txt chatbot/requirements.txt
RUN pip install --no-cache-dir -r chatbot/requirements.txt

COPY chatbot/main.py chatbot/main.py
COPY ui/cv_data.json cv_data.json

WORKDIR /app/chatbot

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
