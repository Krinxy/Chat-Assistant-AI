# Frontend Module

This folder contains the UI layer for ChatBot.

## Structure

```text
frontend/
  src/
    app/
      providers/
      router/
      store/
      config/
      styles/
    pages/
      HomePage/
      ChatPage/
      RecommendationsPage/
      NotificationsPage/
      ProfilePage/
    features/
      chat/
        api/
        components/
        hooks/
        store/
        types/
        utils/
      recommendations/
      notifications/
      weather/
      user-profile/
    entities/
      user/
      message/
      recommendation/
      notification/
    widgets/
      sidebar/
      header/
      navbar/
      shells/
    shared/
      api/
      components/
        ui/
        layout/
        feedback/
      hooks/
      lib/
      utils/
      constants/
      types/
      assets/
      validators/
    main.tsx
    App.tsx
  public/
  tests/
  app.py
  package.json
  tsconfig.json
  vite.config.ts
```

## Runtime Notes

- Streamlit entry point: `frontend/app.py`
- React entry point: `frontend/src/main.tsx`
- Shared authentication module: `frontend/src/shared/components/feedback/auth_component.py`
- Streamlit session state module: `frontend/src/app/store/session_state.py`
- Chat service module: `frontend/src/features/chat/api/chat_service.py`
- Runtime config module: `frontend/src/app/config/runtime_config.py`
- HTTP client module: `frontend/src/shared/api/http_client.ts`

## Credentials (.env)

- Put local credentials in `.env` only and never commit that file.
- CI uses the same environment variable names defined in the workflow environment.

## Linting and Type Checks

From repository root:

```bash
npm run lint
npm run typecheck
python -m flake8 backend frontend --max-line-length=140
python -m black --check backend frontend --line-length=140
python -m bandit -r backend frontend -ll -x backend/tests
```

## Why no .gitkeep in every directory

Git does not track empty folders, only files.

- If a directory is empty and has no tracked file, it will not be part of a commit.
- To avoid noise, this repository keeps `.gitkeep` only where an empty directory must be versioned.
