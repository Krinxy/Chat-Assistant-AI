# Python Services

## Dependency Setup via pyproject.toml

Development bundle:

```bash
pip install .[development]
```

Backend service bundle:

```bash
pip install .[backend]
```

## Start Service (FastAPI/Uvicorn example)

```bash
uvicorn app.main:app --reload
```

## Quality Gates

Canonical quality commands are maintained in [Code Quality](../codequality.md) and [03 Quick Setup](../03_quick_setup.md).

Python security scan command:

```bash
bandit -c pyproject.toml -r coverage services packages scripts --skip B101 --confidence-level high
```

## Credentials and .env

All credentials are read from environment variables.

Local development:

- Create `.env` locally and keep it out of version control.
- Set `OPENAI_API_KEY`, `USERNAME`, `PASSWORD`, and `LOGIN_URL`.

CI:

- Uses the same variable names via GitHub Secrets injection.

## Service Notes

- Keep Python service dependencies in `pyproject.toml` optional groups.
- Keep one `.py` source module with matching test file (`test_*.py` or `*_test.py`).
- API retries should remain capped at 3 attempts.
