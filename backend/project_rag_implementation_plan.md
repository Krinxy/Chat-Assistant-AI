# RAG Backend – Implementierungsplan

> Primäre Referenz für alle Backend-Arbeiten im Chat-Assistant-AI Projekt.
> Basiert auf: "AI Engineering Blueprint for On-Premises RAG Systems" (Weeger et al., arXiv:2604.01395, April 2026)

---

## 1. Projekt-Überblick

- **Arbeitsbereich:** ausschließlich `backend/`
- **Bestehend im Backend:** FastAPI (Python 3.11), Whisper-Transkription via HuggingFace, WebSocket `/ws/transcribe`, Redis Session Cache (+ Fake-Fallback), ffmpeg Audio-Dekodierung, torch Device-Detection (CUDA/XPU/MPS/CPU)
- **Architekturmuster:** `services/core/`, `services/dependency/`, `services/utils/` – sauber getrennt, dieses Muster beibehalten

### Referenz-Repositories

| Repo | URL |
|---|---|
| Enterprise RAG Blueprint (Paper-Autoren) | https://github.com/aiengineeringblueprints/Enterprise_RAG_Blueprint |
| RAGFlow | https://github.com/infiniflow/ragflow |
| kotaemon | https://github.com/Cinnamon/kotaemon |
| FELDM RAG Blueprint | https://github.com/feld-m/rag_blueprint |

---

## 2. Das Paper (Zusammenfassung)

**Titel:** "AI Engineering Blueprint for On-Premises Retrieval-Augmented Generation Systems"
**Autoren:** Weeger, Winkler, Stiehl, von Kistowski, Uhl, Geißelsöder (Ansbach UAS / Gießen / Aschaffenburg UAS)
**arXiv:** 2604.01395v1, 1. April 2026

### Kernaussagen
- Nur 5% aller Enterprise KI-Tools schaffen den Sprung in Produktion (MIT-Studie 2025)
- GDPR, EU AI Act, HIPAA verbieten vielen Unternehmen Cloud-LLMs → on-premises Pflicht
- Das Paper liefert: Referenzarchitektur (4+1 View Model), deployable Reference App, CI/CD Best Practices
- Architektur in **zwei Stufen**: Basic RAG (Kern) + Enterprise RAG (Produktion)

### Anforderungen laut Paper
Security & Data Protection | Quality/Relevance/Accuracy | Explainability | Performance | Continuous Learning | Continuous Operation | Integration in Setup | Scalability | Licensing & Copyright | Ethical Considerations & Bias

---

## 3. Architektur-Diagramme (aus dem Paper)

### Fig. 1 – Functional Architecture (Ablauf eines Requests)

```
User
 │
 ▼
Send Question via UI
 │
 ├──► [Enterprise] Guardrail Question ──► Refine Question ──►─────────────────┐
 │                                                                             │
 ├──► [Enterprise] Authentication ◄──► Access Control ──► Check Access Rights ─┤
 │                                                          │                  │
 │                                              Document Store             Vector DB
 │                                                          │                  │
 │                              Session Context Memory ◄────┴──► Retrieve Data
 │                                      │                              │
 │                               Prompt Template ──────────► Prompt LLM ◄──► LLM
 │                                                                     │
 │                                                    Plausibility and Double Check Answer
 │                                                                     │
 └◄────────────────── Generate Response ◄── [Enterprise] Guardrail Output ◄──┘

Legende: [Basic RAG] = schwarze Boxen | [Enterprise RAG] = blaue Boxen
```

### Fig. 2 – On-Premises Deployment (Docker)

```
┌─────────────────────────────────────────────────────┐    ┌──────────────────┐
│ Docker Host                                          │    │ External Docker  │
│  ┌──────────────────────────────────────────────┐   │    │ Host             │
│  │ Docker Compose Deployment Unit               │   │    │                  │
│  │                                              │   │    │  ┌─────────────┐ │
│  │  Frontend ──► Loader ──► MinIO (S3)          │   │    │  │ Embedding   │ │
│  │     │            │          │                │   │    │  │ Model       │ │
│  │  API Gateway/   Chain ──► VectorDB (Chroma)  │◄──┼────┤  └─────────────┘ │
│  │  Load Balancer   │                           │   │    │                  │
│  │     │         Session/Access Control (SQLite)│   │    │  ┌─────────────┐ │
│  │  Browser       Monitoring                    │   │    │  │ LLM         │ │
│  └──────────────────────────────────────────────┘   │    │  └─────────────┘ │
└─────────────────────────────────────────────────────┘    └──────────────────┘

Legende: Custom Component | Platform Component | Hybrid Component
```

---

## 4. Stack & Framework-Entscheidungen

| Baustein | Tool | Entscheidung |
|---|---|---|
| LLM | **Gemini** (Google) via `langchain-google-genai` | User-Anforderung |
| Chain-Orchestration | **LangChain LCEL** | User-Anforderung, modern, streaming-nativ |
| Embeddings | **sentence-transformers** (lokal, HuggingFace) | Dokumente on-prem halten |
| VectorDB | **ChromaDB** | Paper-Empfehlung, Python-nativ |
| Session Memory | **SQLite + aiosqlite** | Paper-Empfehlung |
| Streaming | **SSE (Server-Sent Events)** | Token-by-token, User-Anforderung |
| Auth | **python-jose + passlib** | Standard FastAPI JWT |
| Dokument-Parsing | **pypdf + python-docx** | Leichtgewichtig |
| Monitoring | **OpenTelemetry Python SDK** | Paper-Empfehlung |

### Wichtiger Trade-off
Gemini ist ein Cloud-Service → **Query + Chunks + History verlassen das Netzwerk**.
Dokumente selbst bleiben on-prem (ChromaDB + lokale Embeddings). Bewusste Entscheidung.

### Guardrails-Strategie
- **3 separate LLM-Calls** (alle via Gemini): Input Guard, Query Refinement, Output Guard
- Guardrail-Calls nutzen `gemini-2.0-flash` (schnell, günstig); Hauptantwort optional `gemini-1.5-pro`
- Output-Guardrail: **blocking** (Client wartet, höhere Qualitätssicherung)

### pyproject.toml Dependencies (backend-Gruppe)

```toml
# RAG Core
"langchain>=0.3"
"langchain-google-genai>=2.0"
"langchain-community>=0.3"
"chromadb>=0.5"
"sentence-transformers>=3.0"

# Document Parsing
"pypdf>=4.0"
"python-docx>=1.0"
"python-multipart>=0.0.9"

# Auth
"python-jose[cryptography]>=3.3"
"passlib[bcrypt]>=1.7"

# Session Memory
"aiosqlite>=0.20"

# Monitoring
"opentelemetry-sdk>=1.25"
"opentelemetry-instrumentation-fastapi>=0.46b0"
```

---

## 5. System Design: Struktur & Request-Flow

### Ziel-Ordnerstruktur

```
backend/app/
├── main.py                          # Erweitern: neue Router einbinden
│
├── api/                             # NEU: HTTP-Endpunkte
│   ├── __init__.py
│   ├── chat.py                      # POST /api/chat  → SSE-Stream
│   ├── documents.py                 # POST /api/documents/upload
│   │                                # GET  /api/documents
│   │                                # DELETE /api/documents/{id}
│   └── auth.py                      # POST /api/auth/login
│                                    # POST /api/auth/register
│
├── services/
│   ├── core/
│   │   ├── chat/                    # BESTEHEND: Whisper Transcription
│   │   │
│   │   ├── rag/                     # NEU
│   │   │   ├── __init__.py
│   │   │   ├── chain.py             # LCEL RAG Chain (Kern-Logik)
│   │   │   ├── retriever.py         # ChromaDB Similarity Search
│   │   │   └── memory.py            # SQLite Conversation History
│   │   │
│   │   ├── guardrails/              # NEU
│   │   │   ├── __init__.py
│   │   │   ├── input_guard.py       # LLM-Call: Query filtern/ablehnen
│   │   │   ├── query_refiner.py     # LLM-Call: Query für Retrieval verbessern
│   │   │   └── output_guard.py      # LLM-Call: Antwort plausibilitätsprüfen
│   │   │
│   │   └── ingestion/               # NEU
│   │       ├── __init__.py
│   │       ├── loader.py            # PDF/DOCX/TXT → reiner Text
│   │       ├── chunker.py           # RecursiveCharacterTextSplitter
│   │       └── embedder.py          # sentence-transformers → ChromaDB
│   │
│   ├── dependency/
│   │   ├── transcription/           # BESTEHEND
│   │   ├── __init__.py
│   │   ├── vectordb.py              # NEU: ChromaDB Client (Singleton)
│   │   ├── llm.py                   # NEU: Gemini LangChain Client
│   │   └── auth.py                  # NEU: JWT FastAPI Dependency
│   │
│   └── utils/
│       ├── transcription/           # BESTEHEND
│       ├── __init__.py
│       └── streaming.py             # NEU: SSE Generator Helper
```

### Request-Flow

```
Client POST /api/chat  (Bearer JWT)
  │
  ▼
Auth Middleware ─── ungültig ──► 401
  │
  ▼
Input Guardrail (gemini-2.0-flash)
  "Ist diese Anfrage angemessen?"
  │
  unangemessen ──► 400 + Rejection-Nachricht
  │
  ▼
Query Refinement (gemini-2.0-flash)
  "Verbessere diese Query für semantisches Retrieval"
  │ → refined_query
  ▼
ChromaDB Retrieval
  sentence-transformers.embed(refined_query) → top-k Chunks
  │
  ▼
Prompt Assembly
  [System Prompt] + [Retrieved Chunks] + [SQLite History] + [User Query]
  │
  ▼
Gemini Stream (LCEL chain.astream())
  │ token by token
  ▼
SSE StreamingResponse → Client
  │
  ▼
Output Guardrail (gemini-2.0-flash, blocking)
  "Ist die Antwort plausibel und safe?"
  │
  ▼
SQLite: Conversation Turn speichern
```

---

## 6. Implementierungs-Phasen mit Definition of Done

### Phase 1 – LLM Client + Basis-Chat-Streaming
**Was:** Gemini via LangChain einbinden, nackter SSE-Streaming-Endpunkt ohne RAG

**Tasks:**
- `services/dependency/llm.py`: `ChatGoogleGenerativeAI` als Singleton, API-Key aus ENV
- `utils/streaming.py`: SSE-Generator-Helper
- `api/chat.py`: `POST /api/chat` nimmt `{message, session_id}`, streamt Gemini-Antwort
- `main.py`: Router einbinden

**Definition of Done:**
- [ ] `POST /api/chat` liefert SSE-Stream mit Gemini-Antwort
- [ ] API-Key kommt ausschließlich aus Environment-Variable `GEMINI_API_KEY`
- [ ] Kein Hardcoded-Token, keine Secrets im Code
- [ ] Tests für LLM-Dependency (mit Mock)
- [ ] Health-Check meldet LLM-Status

---

### Phase 2 – Document Ingestion Pipeline
**Was:** Dokumente hochladen, chunken, embedden, in ChromaDB speichern

**Tasks:**
- `services/dependency/vectordb.py`: ChromaDB Client (persistent, Singleton)
- `services/core/ingestion/loader.py`: PDF/DOCX/TXT → Text
- `services/core/ingestion/chunker.py`: `RecursiveCharacterTextSplitter` (LangChain)
- `services/core/ingestion/embedder.py`: Embedding + ChromaDB upsert
- `api/documents.py`: Upload, List, Delete Endpunkte

**Definition of Done:**
- [ ] PDF, DOCX und TXT-Dateien können hochgeladen werden
- [ ] Chunks landen persistent in ChromaDB
- [ ] `GET /api/documents` listet alle gespeicherten Dokumente
- [ ] `DELETE /api/documents/{id}` entfernt Dokument + Chunks
- [ ] Tests für Loader, Chunker, Embedder (mit Mock-ChromaDB)

---

### Phase 3 – RAG Chain (Retrieval + Generation)
**Was:** Retrieval aus ChromaDB + Prompt-Assembly + Gemini-Stream in einer LCEL Chain

**Tasks:**
- `services/core/rag/retriever.py`: ChromaDB Similarity Search, gibt Chunks + Metadaten zurück
- `services/core/rag/chain.py`: LCEL Runnable: retriever | prompt_template | llm | output_parser
- Streaming über `chain.astream()` in den SSE-Generator einbinden
- `/api/chat` auf RAG-Chain umstellen
- Antwort enthält `sources`-Feld (welche Chunks wurden genutzt)

**Definition of Done:**
- [ ] Antworten basieren nachweislich auf hochgeladenen Dokumenten
- [ ] SSE-Stream liefert Token-by-Token
- [ ] Response enthält Quellenangaben (Dokument-Name, Chunk-Index)
- [ ] Ohne passende Dokumente: klare "Keine Informationen gefunden"-Antwort
- [ ] Tests für Chain (mit Mock-Retriever und Mock-LLM)

---

### Phase 4 – Guardrails (Input + Refinement + Output)
**Was:** Drei separate LLM-Calls als Quality Gate

**Tasks:**
- `services/core/guardrails/input_guard.py`: Klassifizierung der Anfrage (safe/unsafe)
- `services/core/guardrails/query_refiner.py`: Query-Umformulierung für besseres Retrieval
- `services/core/guardrails/output_guard.py`: Plausibilitätsprüfung der Antwort (blocking)
- In `/api/chat` Flow integrieren (vor und nach Chain)
- Separate Prompt-Templates für jeden Guardrail

**Definition of Done:**
- [ ] Unangemessene Anfragen werden abgelehnt (400 + Reason)
- [ ] Refined Query verbessert Retrieval messbar (manueller Test)
- [ ] Output-Guardrail blockiert bis Antwort verifiziert
- [ ] Guardrail-Rejections werden geloggt
- [ ] Tests für alle drei Guardrails (mit Mock-LLM)

---

### Phase 5 – Session Memory (SQLite)
**Was:** Gesprächsverlauf pro Session persistent speichern

**Tasks:**
- `services/core/rag/memory.py`: async SQLite CRUD für Conversation Turns
- DB-Schema: `sessions(id, created_at)`, `messages(id, session_id, role, content, created_at)`
- LangChain Memory-Integration: letzte N Nachrichten als History in Prompt
- Session-ID kommt im Request-Body mit

**Definition of Done:**
- [ ] Gesprächsverlauf wird pro Session in SQLite gespeichert
- [ ] History fließt in den Prompt ein (letzten 10 Nachrichten)
- [ ] Neue Session via `POST /api/sessions` erstellbar
- [ ] `GET /api/sessions/{id}/history` liefert Verlauf
- [ ] Tests für Memory-Schicht

---

### Phase 6 – Auth (JWT)
**Was:** Login/Register, JWT-geschützte Endpunkte, admin/user Rollen

**Tasks:**
- `services/dependency/auth.py`: JWT-Decode als FastAPI Dependency
- `api/auth.py`: `POST /api/auth/register`, `POST /api/auth/login`
- User-Tabelle in SQLite (id, email, hashed_password, role)
- Alle `/api/chat` und `/api/documents` Endpunkte mit JWT absichern
- `admin`-Rolle: darf Dokumente löschen; `user`-Rolle: darf nur chatten + lesen

**Definition of Done:**
- [ ] Login liefert JWT-Token
- [ ] Alle Chat- und Dokument-Endpunkte prüfen JWT
- [ ] `admin` kann Dokumente hochladen und löschen
- [ ] `user` kann nur chatten und Dokumente listen
- [ ] Tests für Auth-Flow (inkl. abgelaufener Token)

---

## 7. Qualität & CI/CD

### Tools

| Tool | Zweck | Konfiguration |
|---|---|---|
| **Bandit** | Security-Checks | `bandit -r .` |
| **Flake8** | PEP8 & Stil | `max-line-length = 140` |
| **isort** | Import-Sortierung | `isort --check-only .` |
| **mypy** | Statische Typprüfung | `mypy .` |
| **SonarQube** | Code Smells, Bugs, Security Hotspots | Quality Gate muss bestanden werden |

### Anforderungen

- Maximale Zeilenlänge: **140 Zeichen**
- Alle Funktionen und Methoden mit **Type Hints**
- Keine ungenutzten Imports, Variablen oder Funktionen
- Keine duplizierte Logik, keine Hardcoded Secrets
- Fehlerbehandlung mit spezifischen Exceptions (kein blankes `except Exception`)
- Kleine, verständliche Funktionen; Docstrings für öffentliche Klassen und Methoden
- **Mindest-Testabdeckung (Coverage): 80 %**

### CI/CD Gate – Merge auf `main` nur wenn

- Unit- und Integrationstests ✓
- Test Coverage ≥ 80 % ✓
- `bandit` ohne kritische Findings ✓
- `flake8`, `isort`, `mypy` ohne Verstöße ✓
- SonarQube Quality Gate bestanden ✓

```bash
bandit -r .
flake8 --max-line-length=140 .
isort --check-only .
mypy .
pytest --cov=. --cov-fail-under=80
```

---

## 8. RAG Implementation Guide (Referenz-Code)

### ChromaDB – Singleton Setup

```python
import chromadb
from chromadb.config import Settings

# services/dependency/vectordb.py
client = chromadb.PersistentClient(
    path="./chroma_db",
    settings=Settings(anonymized_telemetry=False)
)
collection = client.get_or_create_collection(
    name="documents",
    metadata={"hnsw:space": "cosine"}
)
```

VectorDB-Vergleich für spätere Skalierung:

| DB | Stärke | Trade-off |
|---|---|---|
| **ChromaDB** ✓ | Leicht, lokal, Python-nativ | Kein horizontales Scaling |
| Qdrant | Schnell, filtered search | Eigener Server nötig |
| pgvector | SQL-Integration | PostgreSQL-Overhead |
| Milvus | High-Performance, on-prem | Komplexes Setup |

---

### EmbeddingService

```python
from sentence_transformers import SentenceTransformer
from typing import List

MODEL_NAME = "all-MiniLM-L6-v2"  # 384 dims – schnell, gut für DE+EN
# "paraphrase-multilingual-mpnet-base-v2"  # 768 dims – für DE/EN-Mischcontent
# "BAAI/bge-large-en-v1.5"                 # 1024 dims – SOTA Open-Source

class EmbeddingService:
    def __init__(self, model_name: str = MODEL_NAME) -> None:
        self.model = SentenceTransformer(model_name)

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Batch-Embedding für Ingestion."""
        return self.model.encode(texts, normalize_embeddings=True).tolist()

    def embed_query(self, query: str) -> List[float]:
        """Single-Query-Embedding für Retrieval."""
        return self.model.encode([query], normalize_embeddings=True)[0].tolist()
```

---

### LLM Factory (Gemini)

```python
from langchain_google_genai import ChatGoogleGenerativeAI
import os

# services/dependency/llm.py
def get_llm(model: str = "gemini-2.0-flash") -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=model,
        google_api_key=os.environ["GEMINI_API_KEY"],
        temperature=0.1,
        streaming=True,
        convert_system_message_to_human=True  # Gemini-Quirk
    )
```

---

### ChromaRetriever

```python
# services/core/rag/retriever.py
from typing import List, Tuple
import chromadb

class ChromaRetriever:
    def __init__(self, collection: chromadb.Collection, embedding_service: EmbeddingService, k: int = 4) -> None:
        self.collection = collection
        self.embeddings = embedding_service
        self.k = k

    def retrieve(self, query: str) -> List[Tuple[str, dict]]:
        """Similarity Search → (text, metadata) Paare."""
        query_embedding = self.embeddings.embed_query(query)
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=self.k,
            include=["documents", "metadatas", "distances"]
        )
        return list(zip(results["documents"][0], results["metadatas"][0]))
```

Retrieval-Strategie-Vergleich:

| Strategie | Stärke | Wann einsetzen |
|---|---|---|
| **Dense (Embeddings)** ✓ | Semantisches Verständnis | Standard – Phase 1–3 |
| Sparse (BM25) | Exact Keyword Match | Technische Terme, Codes |
| Hybrid (Dense + Sparse) | Beste Coverage | Produktion, gemischte Queries |
| Multi-Query | Robustheit | Vage/mehrdeutige Queries |
| HyDE | Bessere Retrieval-Qualität | Komplexe Wissensdomänen |

---

### LCEL RAG Chain

```python
# services/core/rag/chain.py
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from typing import AsyncIterator, List

RAG_PROMPT = ChatPromptTemplate.from_template(
    """Du bist ein hilfreicher Assistent. Beantworte die Frage ausschließlich basierend auf dem folgenden Kontext.
Wenn der Kontext keine ausreichenden Informationen enthält, antworte mit: "Dazu habe ich keine Informationen in den verfügbaren Dokumenten."

Kontext:
{context}

Frage: {question}

Antwort:"""
)

def build_rag_chain(retriever: ChromaRetriever, llm):
    def format_context(docs: List[tuple]) -> str:
        return "\n\n---\n\n".join(text for text, _ in docs)

    return (
        {
            "context": RunnableLambda(lambda q: format_context(retriever.retrieve(q))),
            "question": RunnablePassthrough()
        }
        | RAG_PROMPT
        | llm
        | StrOutputParser()
    )

# Streaming in api/chat.py:
async def stream_rag_response(question: str) -> AsyncIterator[str]:
    async for chunk in chain.astream(question):
        yield f"data: {chunk}\n\n"
```

---

### Reranking (optional, Phase 3+)

```python
from sentence_transformers import CrossEncoder
from typing import List

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

def rerank(query: str, docs: List[str], top_n: int = 3) -> List[str]:
    pairs = [(query, doc) for doc in docs]
    scores = reranker.predict(pairs)
    return [doc for _, doc in sorted(zip(scores, docs), reverse=True)[:top_n]]
```

---

### LangGraph Pattern (für zukünftige agentic Erweiterungen)

```python
from langgraph.graph import StateGraph, START, END
from typing import TypedDict, List

class RAGState(TypedDict):
    question: str
    refined_query: str
    context: List[tuple]
    answer: str
    sources: List[dict]

async def refine_query(state: RAGState) -> RAGState:
    return {"refined_query": await query_refiner.ainvoke(state["question"])}

async def retrieve(state: RAGState) -> RAGState:
    return {"context": retriever.retrieve(state["refined_query"])}

async def generate(state: RAGState) -> RAGState:
    context_text = "\n\n".join(text for text, _ in state["context"])
    response = await llm.ainvoke(RAG_PROMPT.format_messages(context=context_text, question=state["question"]))
    return {"answer": response.content, "sources": [meta for _, meta in state["context"]]}

builder = StateGraph(RAGState)
builder.add_node("refine_query", refine_query)
builder.add_node("retrieve", retrieve)
builder.add_node("generate", generate)
builder.add_edge(START, "refine_query")
builder.add_edge("refine_query", "retrieve")
builder.add_edge("retrieve", "generate")
builder.add_edge("generate", END)

rag_graph = builder.compile()
```

---

## 9. Offene Entscheidungen

- [ ] **Dokument-Zugriffskontrolle:** geteilte Wissensbasis für alle User ODER per-user Collections in ChromaDB?
- [ ] **Guardrail-Modell:** `gemini-flash` für alle Guards, oder `gemini-pro` für Output-Guard?
