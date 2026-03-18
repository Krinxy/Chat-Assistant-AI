# Architecture Overview

## System Architecture

Chat Assistant AI is a microservice-style application with three main components:

```
┌─────────────────┐      HTTP/REST      ┌──────────────────────┐
│  Streamlit      │ ──────────────────► │  FastAPI Backend     │
│  Frontend       │                     │  (Python 3.11)       │
│  (Port 8501)    │ ◄────────────────── │  (Port 8000)         │
└─────────────────┘                     └──────┬───────────────┘
                                               │
                              ┌────────────────┼────────────────┐
                              │                │                │
                    ┌─────────▼──┐  ┌──────────▼──┐  ┌────────▼──────┐
                    │  MongoDB   │  │  ChromaDB   │  │  OpenAI API   │
                    │  (Port     │  │  (Vector    │  │  (External)   │
                    │   27017)   │  │   Store)    │  │               │
                    └────────────┘  └─────────────┘  └───────────────┘
```

## Backend Layers

### 1. API Layer (`app/api/`)
Thin FastAPI route handlers. Validates input, calls service, returns response. No business logic.

### 2. Service Layer (`app/services/`)
Business logic lives here. Services are injected with a database handle.

| Service | Responsibility |
|---|---|
| `OrchestratorService` | Full pipeline: classify → route → execute |
| `ChatService` | Conversation management |
| `RoutingService` | Intent & domain classification via LLM |
| `RecommendationService` | Candidate generation → filter → rank |
| `BehaviorTrackingService` | Event recording & pattern analysis |
| `UserProfileService` | Profile CRUD |
| `NotificationService` | Create/read notifications, smart alerts |
| `WeatherService` | Weather data + saved locations |
| `MemoryService` | Vector-based memory storage/retrieval |
| `RetrievalService` | RAG retrieval + reranking |
| `DocumentService` | Document ingestion & querying |

### 3. Agent Layer (`app/agents/`)
Agents wrap services into intent-specific processors.

- `OrchestratorAgent` — routes to the right agent
- `GeneralAgent` — LLM fallback
- `WeatherAgent` — weather context injection
- `RecommendationAgent` — recommendation context
- `DocumentAgent` — RAG Q&A

### 4. Pipeline Layer (`app/pipelines/`)
Multi-step data processing pipelines.

- `DocumentIngestionPipeline` — load → clean → chunk → embed → store
- `RetrievalPipeline` — embed → search → rerank → augment
- `RecommendationPipeline` — profile → behavior → candidates → filter → rank

### 5. Repository Layer (`app/repositories/`)
Async MongoDB CRUD via motor.

### 6. Integration Layer (`app/integrations/`)
Third-party clients: OpenAI, OpenWeatherMap, ChromaDB, sentence-transformers.

## Data Flow (Chat Request)

```
User Message
    │
    ▼
POST /chat/message
    │
    ▼
OrchestratorService.process()
    ├── RoutingService.classify_intent()   → intent label
    ├── RoutingService.classify_domain()   → domain label
    ├── BehaviorTrackingService.track_event()
    └── OrchestratorAgent.process()
            ├── [weather intent]  → WeatherAgent → WeatherService + ChatService
            ├── [rec intent]      → RecommendationAgent → RecommendationService + ChatService
            ├── [doc intent]      → DocumentAgent → RetrievalService + ChatService
            └── [general intent]  → GeneralAgent → ChatService → LLMProvider
```
