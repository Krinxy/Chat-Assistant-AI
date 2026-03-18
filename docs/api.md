# API Documentation

Base URL: `http://localhost:8000`

All endpoints except `/health`, `/auth/register`, and `/auth/login` require a Bearer token.

## Authentication

### Register
`POST /auth/register`

```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!"
}
```

**Response 201:**
```json
{
  "id": "64f...",
  "email": "user@example.com",
  "username": "johndoe",
  "created_at": "2024-01-01T00:00:00Z",
  "is_active": true
}
```

### Login
`POST /auth/login`

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response 200:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

## Chat

### Send Message
`POST /chat/message`

```json
{
  "message": "What is the weather in London?",
  "session_id": "optional-session-id"
}
```

**Response 200:**
```json
{
  "session_id": "64f...",
  "message": "The weather in London is currently...",
  "role": "assistant"
}
```

### Get History
`GET /chat/history/{session_id}`

**Response 200:** Array of `MessageSchema`

### Create Session
`POST /chat/session`

**Response 201:** `{"session_id": "64f..."}`

## Profile

### Get Profile
`GET /profile`

### Update Profile
`PUT /profile`

```json
{
  "interests": ["technology", "travel"],
  "preferences": {"theme": "dark"},
  "locations": ["London", "Paris"],
  "activity_times": {}
}
```

## Recommendations

### Get Recommendations
`GET /recommendations`

**Response 200:**
```json
{
  "user_id": "64f...",
  "recommendations": [
    {
      "id": "uuid",
      "title": "AI Insights",
      "description": "Curated content about AI in technology.",
      "category": "technology",
      "score": 0.8,
      "metadata": {}
    }
  ]
}
```

## Weather

### Get Weather
`GET /weather?city=London`

### Get Saved Locations
`GET /weather/locations`

### Add Location
`POST /weather/locations?city=London`

## Notifications

### Get Notifications
`GET /notifications?unread_only=false`

### Mark Read
`PUT /notifications/{notification_id}/read`

## Behavior

### Track Event
`POST /behavior/event`

```json
{
  "event_type": "recommendation_view",
  "data": {"category": "technology"}
}
```

### Get Events
`GET /behavior/events`

## Documents

### Upload Document
`POST /documents/ingest`

Form data with `file` field (UTF-8 text file).

### List Documents
`GET /documents`

### Delete Document
`DELETE /documents/{doc_id}`
