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


## ?? Lokale Entwicklung starten

Wann immer du das Projekt frisch auscheckst oder neue Packages via KI hinzugefuegt wurden (wie framer-motion), **musst** du die Abhaengigkeiten neu installieren:

1. **In das Frontend-Verzeichnis wechseln:**
`ash
cd frontend
``n2. **Abhaengigkeiten installieren:**
`ash
npm install
``n3. **Entwicklungsserver starten:**
`ash
npm run dev
``n
Das Frontend laeuft danach standardmaessig auf http://localhost:5173.

---

## ?? Bekannte UI/UX Fehlerquellen & Troubleshooting

Sollte das Layout nach Code-Aenderungen komplett zerschossen sein (ueberschneidende Boxen, fehlende Margins, Sidebar kaputt):

- **Grid-Mismatch durch React:** 
  Verstecke Elemente wie die Sidebar **nie** per \eturn null;\ in React, wenn das umschliessende CSS (\.dashboard-shell\) explizit mehrere Spalten verlangt (\grid-template-columns\). Nutze stattdessen CSS-Klassen zum Ausblenden (z.B. \.is-collapsed\), andernfalls bricht das Grid zusammen und alle Contents rutschen unkontrolliert in die linke, kleine Spalte.
- **Fehlende UI-Boxen:** 
  Achte in der \dashboard.css\ darauf, dass Widgets einen echten Hintergrund (\ackground: var(--panel)\) und eine feste Umrandung (\ox-shadow: var(--shadow-sm); border: 1px solid var(--line);\) haben. Transparenz-Variablen wie \--panel-soft\ lassen das Dashboard unstrukturiert wirken.
