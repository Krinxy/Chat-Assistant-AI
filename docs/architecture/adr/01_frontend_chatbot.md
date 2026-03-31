# UI for frontend

| TITLE | Homepage |
|-------|-------|
| Status | Open |
| Context | Homepage dashboard shown after login, acting as the container frame for all other UI modules. |
| Decision |  |
| Consequences |  |
| Alternative |  |
| Funktionaler Aufbau |  |

## Implementation Baseline

The frontend module keeps the UI structure under `frontend/src` with these top-level domains:

- `app` for providers/router/store/config/styles
- `pages` for route-level screens
- `features` for feature slices (chat, recommendations, notifications, weather, user-profile)
- `entities` for domain models (user, message, recommendation, notification)
- `widgets` for reusable page-level building blocks
- `shared` for common api/components/hooks/lib/utils/constants/types/assets/validators

Reference: `frontend/README.md`