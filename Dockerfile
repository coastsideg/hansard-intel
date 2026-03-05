# Multi-stage build: builds React frontend then serves everything from FastAPI

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Python backend
FROM python:3.11-slim
WORKDIR /app

# System deps for pdfplumber and lxml
RUN apt-get update && apt-get install -y \
    libpq-dev gcc g++ \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY backend/ .

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Create data directory
RUN mkdir -p /data/pdfs

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
