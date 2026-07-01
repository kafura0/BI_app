FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /tmp/backend-req.txt
COPY ai-engine/requirements.txt /tmp/ai-req.txt
RUN pip install --no-cache-dir -r /tmp/backend-req.txt -r /tmp/ai-req.txt

COPY backend/ .
COPY ai-engine/ /ai-engine/

ENV PYTHONPATH="/app:/ai-engine"

EXPOSE 8000

COPY scripts/ /scripts/
CMD python /scripts/db_check.py && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
