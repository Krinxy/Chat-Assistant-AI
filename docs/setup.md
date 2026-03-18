# Setup Guide

## Prerequisites
- Docker & Docker Compose
- OpenAI API key
- OpenWeatherMap API key

## Quick Start

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

docker-compose up --build
```

Frontend: http://localhost:8501  
Backend API: http://localhost:8000/docs

## Local Development

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

cd frontend
pip install -r requirements.txt
streamlit run app.py
```

## Running Tests

```bash
cd backend
pytest tests/ -v --asyncio-mode=auto
```
