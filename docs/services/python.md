# Python Services

## Dependency Setup via pyproject.toml

Development bundle:

```bash
pip install -e ".[development]"
```

Backend service bundle:

```bash
pip install -e ".[backend]"
```

The backend bundle includes speech/transcription dependencies.

## Start Service (FastAPI/Uvicorn example)

```bash
uvicorn backend.app.main:app --reload
```

Whisper websocket endpoint:

```text
ws://localhost:8000/ws/transcribe
```

Layered local flow:

```text
backend/app/main.py
	-> backend/app/services/core/chat/transcription/websocket.py
	-> backend/app/services/core/chat/transcription/handler.py
	-> backend/app/services/transcription_runtime.py
	-> backend/app/services/core/chat/transcription/transcriber.py
	-> backend/app/services/dependency/transcription/speech_cache.py
	-> backend/app/services/dependency/transcription/redis_fake.py
```

Speech cache policy:

- Raw audio bytes are not persisted.
- Cache keeps only short-lived chunk metadata and transcript state.
- Chunk state is overwritten from `received` to `transcribed` and cleared when the websocket session ends.
- Default TTL is 20 seconds and can be tuned using `SPEECH_CACHE_TTL_SECONDS`.

Transcriber fallback policy:

- If local Whisper dependencies are available, the backend uses the real Whisper runtime.
- ffmpeg is resolved from system PATH first, then from `imageio-ffmpeg` if PATH does not provide it.
- If Whisper dependencies are missing, FakeTranscriber fallback is used automatically.
- Disable fallback with `WHISPER_ENABLE_FAKE_FALLBACK=0` to force dependency errors.

## Quality Gates

Canonical quality commands are maintained in [Code Quality](../codequality.md) and [03 Quick Setup](../03_quick_setup.md).

Python security scan command:

```bash
bandit -r backend frontend -ll -x backend/tests
```

## Credentials and .env

All credentials are read from environment variables.

Local development:

- Create `.env` locally and keep it out of version control.
- Set `OPENAI_API_KEY`, `USERNAME`, `PASSWORD`, and `LOGIN_URL`.

CI:

- Uses workflow-defined environment variables and supports runner/repository overrides.

## Service Notes

- Keep Python service dependencies in `pyproject.toml` optional groups.
- Keep one `.py` source module with matching test file (`test_*.py` or `*_test.py`).
- API retries should remain capped at 3 attempts.
