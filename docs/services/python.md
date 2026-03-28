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

```bash
flake8 .
black --check .
bandit -r .
mypy .
pytest
```

## Service Notes

- Keep Python service dependencies in `pyproject.toml` optional groups.
- Keep one `.py` source module with matching test file (`test_*.py` or `*_test.py`).
- API retries should remain capped at 3 attempts.
