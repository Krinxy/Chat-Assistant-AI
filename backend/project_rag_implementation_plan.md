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
| LLM | **OpenAI-kompatibles Gateway** (institutionell/on-prem) via `langchain-openai` `ChatOpenAI` — **Default: `qwen3.5-think`** (Thinking/Reasoning); Guardrails: `Qwen3.5-397B-A17B_No_Thinking` | User-Anforderung, **ersetzt Gemini** |
| Chain-Orchestration | **LangChain LCEL** | User-Anforderung, modern, streaming-nativ |
| Embeddings | **sentence-transformers** (lokal, HuggingFace) | Dokumente on-prem halten |
| VectorDB | **ChromaDB** | Paper-Empfehlung, Python-nativ |
| Session Memory | **SQLite + aiosqlite** | Paper-Empfehlung |
| Streaming | **SSE (Server-Sent Events)** | Token-by-token, User-Anforderung |
| Auth | **python-jose + passlib** | Standard FastAPI JWT |
| Dokument-Parsing | **pypdf + python-docx** | Leichtgewichtig |
| Monitoring | **OpenTelemetry Python SDK** | Paper-Empfehlung |

### Wichtiger Trade-off
Das LLM läuft **nicht** bei Google, sondern hinter einem **OpenAI-kompatiblen Gateway**
(institutionell bzw. on-prem gehostet, Zugang siehe
https://github.com/dias-digitial-assistant/llm_access). Angebunden wird es generisch
über `base_url` + `api_key` mit `langchain-openai` (`ChatOpenAI`) bzw. dem `openai`-SDK.
Damit ist die On-Premises-Anforderung des Papers deutlich besser erfüllt als mit einem
Cloud-LLM: **Query + Chunks + History verlassen das Institutionsnetz nicht**, sofern das
Gateway intern betrieben wird. Dokumente + Embeddings bleiben ohnehin vollständig lokal
(ChromaDB + sentence-transformers). Bewusste Entscheidung — der konkrete Hosting-Ort des
Gateways ist datenschutzrechtlich zu prüfen.

### Guardrails-Strategie
- **3 separate LLM-Calls** (alle über das OpenAI-kompatible Gateway): Input Guard, Query Refinement, Output Guard
- Guardrails nutzen das **No-Thinking-Modell** (`Qwen3.5-397B-A17B_No_Thinking`, `temperature=0`) → schnell, deterministisch, kein Token-Budget fürs Reasoning
- Hauptantwort (RAG Chain): **`qwen3.5-think`** (Thinking) → bessere Antwortqualität bei komplexen Dokumentfragen
- Output-Guardrail: **blocking** (Client wartet, höhere Qualitätssicherung)

### pyproject.toml Dependencies (backend-Gruppe)

```toml
# RAG Core
"langchain>=0.3"
"langchain-openai>=0.2"
"openai>=1.0"
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
│   │   ├── llm.py                   # NEU: ChatOpenAI Client (OpenAI-komp. Gateway)
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
Input Guardrail (No-Thinking-Modell)
  "Ist diese Anfrage angemessen?"
  │
  unangemessen ──► 400 + Rejection-Nachricht
  │
  ▼
Query Refinement (No-Thinking-Modell)
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
LLM Stream (ChatOpenAI, LCEL chain.astream())
  │ token by token
  ▼
SSE StreamingResponse → Client
  │
  ▼
Output Guardrail (No-Thinking-Modell, blocking)
  "Ist die Antwort plausibel und safe?"
  │
  ▼
SQLite: Conversation Turn speichern
```

---

## 6. Arbeitspaket-Plan – Sequenziell-Parallele Umsetzung (2 Personen)

### Übersicht

Zwei parallele Spuren die nach AP 0 gleichzeitig starten und beim Integration-Merge zusammenkommen.
GitHub Issues sind der primäre Tracking-Ort — diese Sektion dokumentiert Abhängigkeiten und Aufteilung.

```
AP 0  – Projektfundament & CI/CD          [beide · blocking]
  │
  ├── Spur A ──────────────────────────────────────────────────────────
  │   AP 1A  #19  ChromaDB Integration & Retrieval Validation
  │   AP 2A  #20  LLM-Integration via LangChain (OpenAI-komp. Gateway) & Streaming Chat
  │   AP 3A        Basis-Chat & Session Memory
  │
  └── Spur B ──────────────────────────────────────────────────────────
      AP 1B  #21  JWT Authentication & Role-Based Access Control
      AP 2B  #22  Guardrails – Input Guard, Query Refiner, Output Guard
      AP 3B  #23  Document API Endpoints & JWT Protection

  ⛙  Integration-Merge  [beide · alle APs 1–3 müssen grün sein]

  AP 4        RAG Chain (vollständig, alle Komponenten zusammen)
  AP 5        Monitoring & Hardening  [optional]
```

---

### AP 0 – Projektfundament & CI/CD
**Wer:** beide gemeinsam · **Blocking:** alle anderen APs

**Tasks:**
- `pyproject.toml` mit allen Deps finalisieren (einmalig, vollständig)
- `.flake8`, `mypy.ini`, `.isort.cfg`, `bandit`-Config anlegen
- GitHub Actions Pipeline: alle 5 Guards aus Section 7 Qualität
- `pytest`-Config mit `--cov-fail-under=80`
- `docker-compose.yml` für lokales Dev-Setup
- `.env.example` mit `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `LLM_MODEL` (default: `qwen3.5-think`), `LLM_GUARD_MODEL` (default: `Qwen3.5-397B-A17B_No_Thinking`), `JWT_SECRET`, `CHROMA_PATH`

**Definition of Done:**
- [ ] Pipeline läuft durch auf leerem Repo
- [ ] Alle Tools konfiguriert und lokal ausführbar
- [ ] `.env.example` vollständig, keine echten Keys committed

---

### Spur A – Infrastruktur & RAG

#### AP 1A – ChromaDB Integration & Retrieval Validation
**GitHub:** `#19` · **Blocked by:** AP 0

**Tasks:**
- `services/dependency/vectordb.py`: `PersistentClient`, Cosine-Similarity-Collection, Singleton
- `services/core/ingestion/loader.py`: PDF/DOCX/TXT → Text
- `services/core/ingestion/chunker.py`: `RecursiveCharacterTextSplitter` (512/50)
- `services/core/ingestion/embedder.py`: sentence-transformers → ChromaDB upsert
- `conftest.py`: Mock-Fixture für ChromaDB

**Definition of Done:**
- [ ] 20-Dokument Ground-Truth-Corpus in ChromaDB ladbar
- [ ] Top-1-Hit-Rate ≥ 80 % auf Ground-Truth-Queries
- [ ] Cosine-Similarity-Score ≥ definierter Threshold
- [ ] Unit-Tests für loader, chunker, embedder mit Mock-ChromaDB
- [ ] `flake8`, `mypy`, `bandit` clean · Coverage ≥ 80 %

---

#### AP 2A – LLM-Integration via LangChain (OpenAI-kompatibles Gateway) & Streaming Chat
**GitHub:** `#20` · **Blocked by:** `#19`

**Tasks:**
- `langchain-openai` (+ `openai`) zu `pyproject.toml`
- `services/dependency/llm.py`: `ChatOpenAI` Singleton Factory gegen OpenAI-kompatibles Gateway (`base_url` + `api_key` aus ENV), Default-Modell `Qwen3.5-397B-A17B_No_Thinking`, optional `qwen3.5-think`
- `utils/streaming.py`: SSE-Generator-Helper (`delta.content` kann `None` sein → überspringen)
- `api/chat.py`: `POST /api/chat` mit `{message, session_id}`, streamt LLM-Antwort
- `/health`: LLM-Status ohne echten Inference-Call
- `main.py`: Router einbinden

**Definition of Done:**
- [ ] `POST /api/chat` liefert Token-by-Token SSE-Stream
- [ ] `OPENAI_API_KEY` **und** `OPENAI_BASE_URL` ausschließlich aus ENV, nie geloggt
- [ ] `ChatOpenAI`/Client mit `timeout` gesetzt (hängender Server blockiert nicht ewig)
- [ ] Unit-Tests mit gemockten API-Calls, kein echter Call in CI
- [ ] `flake8`, `mypy`, `bandit` clean · Coverage ≥ 80 %

---

#### AP 3A – Basis-Chat & Session Memory
**Blocked by:** `#20`

**Tasks:**
- `aiosqlite` zu `pyproject.toml`
- `services/core/rag/memory.py`: async SQLite CRUD für Conversation Turns
- DB-Schema: `sessions(id, created_at)`, `messages(id, session_id, role, content, created_at)`
- `POST /api/sessions`, `GET /api/sessions/{id}/history`
- LangChain Memory-Integration: letzte 10 Nachrichten als History in Prompt

**Definition of Done:**
- [ ] Gesprächsverlauf wird pro Session in SQLite gespeichert
- [ ] History fließt in den Prompt ein (letzte 10 Nachrichten)
- [ ] Session-Endpunkte funktionieren ohne Auth (wird in AP 3B gesichert)
- [ ] Unit-Tests für Memory-Schicht
- [ ] `flake8`, `mypy`, `bandit` clean · Coverage ≥ 80 %

---

### Spur B – Security & Integration

#### AP 1B – JWT Authentication & Role-Based Access Control
**GitHub:** `#21` · **Blocked by:** AP 0

**Tasks:**
- `python-jose[cryptography]`, `passlib[bcrypt]` zu `pyproject.toml`
- User-Tabelle in SQLite: `users(id, email, hashed_password, role, created_at)`
- `services/dependency/auth.py`: JWT-Decode als FastAPI Dependency
- `api/auth.py`: `POST /api/auth/register`, `POST /api/auth/login`
- Rollen: `admin` (upload + delete), `user` (chat + list)
- SSO-Extension-Point vorbereiten (abstrakte Auth-Dependency, swappable)

**Definition of Done:**
- [ ] Login liefert signierten JWT-Token
- [ ] Kein Token → `401`, abgelaufener Token → `401` mit klarer Message
- [ ] `user` auf geschützter Admin-Route → `403`
- [ ] Passwörter bcrypt-gehasht, nie geloggt
- [ ] `JWT_SECRET` ausschließlich aus ENV
- [ ] Unit-Tests inkl. abgelaufener + manipulierter Token

---

#### AP 2B – Guardrails – Input Guard, Query Refiner & Output Guard
**GitHub:** `#22` · **Blocked by:** `#20` (LLM-Anbindung muss stehen)

**Tasks:**
- `services/core/guardrails/input_guard.py`: Query klassifizieren (`safe`/`unsafe`)
- `services/core/guardrails/query_refiner.py`: Query für Retrieval umformulieren
- `services/core/guardrails/output_guard.py`: Plausibilitätsprüfung der Antwort (blocking)
- Eigenes Prompt-Template pro Guardrail, alle auf dem No-Thinking-Modell (`Qwen3.5-397B-A17B_No_Thinking`, `temperature=0`)
- Guardrail-Rejections loggen mit `session_id`, `reason`, `timestamp`

**Definition of Done:**
- [ ] Unsafe Query → `400` + Reason, nichts in ChromaDB oder SQLite geschrieben
- [ ] Refined Query messbar besser auf 5 manuellen Test-Queries
- [ ] Output-Guardrail blocking — kein fire-and-forget
- [ ] Unit-Tests für alle drei mit gemocktem LLM
- [ ] Kein User-Datum oder Chunk-Inhalt in Logs
- [ ] `flake8`, `mypy`, `bandit` clean · Coverage ≥ 80 %

---

#### AP 3B – Document API Endpoints & JWT Protection
**GitHub:** `#23` · **Blocked by:** `#19` (ChromaDB) · `#21` (JWT)

**Tasks:**
- `api/documents.py`: `POST /api/documents/upload`, `GET /api/documents`, `DELETE /api/documents/{id}`
- `python-multipart` zu `pyproject.toml`
- Upload → `loader → chunker → embedder → ChromaDB upsert` in einer Request-Lifecycle
- Delete → Dokument-Metadata UND alle zugehörigen Chunks aus ChromaDB entfernen
- JWT-Middleware auf alle drei Routes
- Rollen-Check: `admin` für POST + DELETE, `user` nur GET
- Duplicate-Detection: gleicher Filename + Hash → `409 Conflict`

**Definition of Done:**
- [ ] Upload PDF → Chunks in ChromaDB → List zeigt Dokument → Delete → Chunks weg
- [ ] Duplicate-Upload → `409`
- [ ] `user` auf DELETE → `403`, kein Token → `401`
- [ ] Kein falsches Format → `415`
- [ ] Unit-Tests mit gemocktem ChromaDB + gemockter Auth-Dependency
- [ ] `flake8`, `mypy`, `bandit` clean · Coverage ≥ 80 %

---

### ⛙ Integration-Merge
**Wer:** beide gemeinsam · **Blocked by:** alle APs 1–3 beider Spuren

Vor dem Merge müssen alle folgenden Issues auf `closed` stehen: `#19`, `#20`, `#21`, `#22`, `#23` + AP 3A.

**Merge-Checkliste:**
- [ ] Spur-A-Branch und Spur-B-Branch konfliktfrei zusammengeführt
- [ ] Vollständiger End-to-End-Test: Register → Login → Upload → Chat → Guardrail → RAG-Antwort mit Sources
- [ ] Alle CI/CD-Guards grün auf `main`
- [ ] Keine offenen `TODO`s oder `FIXME`s in mergtem Code

---

### AP 4 – RAG Chain (vollständig)
**Blocked by:** Integration-Merge

**Tasks:**
- `services/core/rag/retriever.py`: ChromaDB Similarity Search, Chunks + Metadaten
- `services/core/rag/chain.py`: LCEL: `retriever | prompt_template | llm | output_parser`
- `chain.astream()` in SSE-Generator einbinden
- `/api/chat` auf RAG-Chain umstellen (ersetzt nackten LLM-Call)
- Guardrails in Flow integrieren: Input Guard → Query Refiner → Chain → Output Guard
- Response enthält `sources`-Feld (Dokument-Name, Chunk-Index)
- Fallback: "Keine Informationen gefunden" wenn kein relevanter Chunk

**Definition of Done:**
- [ ] Antworten basieren nachweislich auf hochgeladenen Dokumenten
- [ ] SSE-Stream liefert Token-by-Token mit `sources`
- [ ] Guardrails aktiv im vollständigen Flow
- [ ] Auth auf `/api/chat` aktiv
- [ ] Tests für Chain mit Mock-Retriever + Mock-LLM
- [ ] SonarQube Quality Gate bestanden
- [ ] `flake8`, `mypy`, `bandit` clean · Coverage ≥ 80 %

---

### AP 5 – Monitoring & Hardening (optional, nach Go-Live)
**Tasks:**
- OpenTelemetry SDK + FastAPI-Instrumentation
- Traces für RAG-Chain (Embedding-Latenz vs. Retrieval vs. LLM)
- SonarQube-Scan in CI/CD Pipeline
- Performance-Baseline dokumentieren

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
| Weaviate | Hybrid Search, GraphQL | Ressourcenintensiv |

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

Embedding-Modell-Vergleich (2026):

| Modell | Dims | Stärke | Hinweis |
|---|---|---|---|
| `all-MiniLM-L6-v2` ✓ | 384 | Schnell, kompakt | Standard im Projekt |
| `paraphrase-multilingual-mpnet-base-v2` | 768 | Multilingual | Für DE/EN-Mischcontent |
| `BAAI/bge-large-en-v1.5` | 1024 | SOTA Open-Source | Höherer RAM-Bedarf |
| `voyage-3-large` | 1024 | Anthropic-empfohlen | Cloud, kostenpflichtig |
| `text-embedding-3-large` | 3072 | OpenAI SOTA | Cloud, kostenpflichtig |

---

### LLM Factory (OpenAI-kompatibles Gateway)

```python
from langchain_openai import ChatOpenAI
import os

# services/dependency/llm.py
# Das LLM laeuft hinter einem OpenAI-kompatiblen Gateway (base_url + api_key).
# langchain-openai liest OPENAI_API_KEY automatisch aus der ENV; base_url
# wird hier explizit gesetzt.
CHAT_MODEL = os.getenv("LLM_MODEL", "qwen3.5-think")           # Hauptantwort
GUARD_MODEL = os.getenv("LLM_GUARD_MODEL", "Qwen3.5-397B-A17B_No_Thinking")  # Guardrails

def get_llm(model: str = CHAT_MODEL, *, temperature: float = 0.7) -> ChatOpenAI:
    return ChatOpenAI(
        model=model,
        base_url=os.environ["OPENAI_BASE_URL"],
        api_key=os.environ["OPENAI_API_KEY"],
        temperature=temperature,
        streaming=True,
        timeout=30.0,  # haengender Server blockiert uns nicht ewig
    )

# Modell-Strategie im Projekt:
# - Hauptantwort (RAG Chain): "qwen3.5-think" (Thinking) → bessere Qualitaet bei
#   komplexen Dokumentfragen; Reasoning erscheint NICHT im SSE-Stream (nur Antwort-Text)
# - Guardrails (Input/Output Guard, Query Refinement): "Qwen3.5-397B-A17B_No_Thinking",
#   temperature=0 → schnell, deterministisch, kein Token-Budget fuers Reasoning
#
# Achtung Thinking-Modelle: verbrauchen Tokens fuer internes Reasoning, bevor Antwort-
# Text entsteht. Ist max_tokens zu klein, geht das ganze Budget ins Denken und content
# bleibt leer. Beim Streaming koennen einzelne delta.content-Werte None sein.
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
from dataclasses import dataclass

RAG_PROMPT = ChatPromptTemplate.from_template(
    """Du bist ein hilfreicher Assistent. Beantworte die Frage ausschließlich basierend auf dem folgenden Kontext.
Wenn der Kontext keine ausreichenden Informationen enthält, antworte mit: "Dazu habe ich keine Informationen in den verfügbaren Dokumenten."

Kontext:
{context}

Frage: {question}

Antwort:"""
)

@dataclass
class RAGResponse:
    answer: str
    sources: List[dict]

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
from langchain_core.documents import Document
from typing import TypedDict, List

class RAGState(TypedDict):
    question: str
    refined_query: str
    context: List[Document]
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

- [ ] **Output-Guardrail blocking oder fire-and-forget?** (bisher: blocking geplant)
- [ ] **Dokument-Zugriffskontrolle:** geteilte Wissensbasis für alle User ODER per-user Collections in ChromaDB?
- [x] **Guardrail-Modell:** No-Thinking (`Qwen3.5-397B-A17B_No_Thinking`) für alle Guards — schnell + deterministisch; Hauptantwort auf `qwen3.5-think` (Thinking). Entschieden.
