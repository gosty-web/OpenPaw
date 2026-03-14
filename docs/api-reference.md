# API Reference

OpenPaw exposes a comprehensive RESTful API to manage the backend system natively. This implies you can build mobile apps, separate web clients, or embed OpenPaw functionalities into existing enterprise software.

## Base URL

By default, the API is available at: `http://localhost:7411/api/`

## Authentication

Every API call (except `/api/health` and `/api/login`) requires the OpenPaw token. If not disabled, you must include it either:
1. via HTTP Header `Authorization: Bearer <TOKEN>`
2. via custom HTTP Header `X-OpenPaw-Token: <TOKEN>`

## Agents

### `GET /api/agents`
Returns a list of all initialized agents.
```json
// Response
[
  { "id": "uuid-1234", "name": "ResearchBot", "provider": "anthropic", "status": "idle" }
]
```

### `POST /api/agents`
Creates a brand new agent.
```json
// Request
{
  "name": "DevSecOps",
  "role": "Security Engineer",
  "provider": "openai",
  "model": "gpt-4o",
  "systemPrompt": "Audit the code",
  "temperature": 0.4
}
// Response: Returns the generated agent object
```

### `GET /api/agents/:id`
Returns full details of an agent including settings, configurations, and identity.

### `PATCH /api/agents/:id`
Updates a specific agent configuration. Partial payloads are accepted.

### `DELETE /api/agents/:id`
Deletes the specific agent and purges their data.

## Communications (Chat)

### `POST /api/chat`
Sends a message to an agent synchronously.
```json
// Request
{
  "agentId": "uuid-1234",
  "message": "Summarize my emails.",
  "sessionId": "default"
}
```

### `GET /api/agents/:id/stream?message=hello&sessionId=default`
Sends a message and returns an EventStream (Server Sent Events) of chunks from the LLM.

## Memories

### `POST /api/agents/:id/memory`
Injects manual contextual memory into an agent's semantic or episodic database.
```json
// Request
{
  "content": "The user is from California.",
  "tier": "semantic",
  "importance": 0.9,
  "tags": ["user_info"]
}
```

## System Management

### `GET /api/health`
Returns system status.
```json
// Response
{
  "status": "healthy",
  "version": "0.1.0",
  "counts": {
    "agents": 4,
    "mcps": 1,
    "skills": 2,
    "messages": 105
  }
}
```

> **Note:** A complete schema of all supported payloads can be viewed dynamically using external documentation generation tools against the running OpenPaw server.
