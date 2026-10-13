FROM python:3.13-slim

# LITELLM_LOCAL_MODEL_COST_MAP keeps LiteLLM from fetching its price table at startup.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    LITELLM_LOCAL_MODEL_COST_MAP=True

WORKDIR /srv

# Install dependencies — separate layer for better cache reuse
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app/ ./app/
COPY knowledge/ ./knowledge/

# Run as a non-root user for least-privilege
RUN useradd --system --no-create-home appuser
USER appuser

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8787/api/v1/health')" || exit 1

# One worker: the usage limits are kept in process memory.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8787"]
