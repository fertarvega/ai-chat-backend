```markdown:README.md
# AI Chat Backend

A Node.js backend service that provides API endpoints for AI chat functionality using Groq's LLM API.

## Features
- **AI Chat Completion**: Stream responses from Groq's LLama 3.3 70B model.
- **Conversation History**: Automatically stores and retrieves chat history using Redis.
- **Chat Title Generation**: Creates relevant titles for conversations.
- **Conversation Management**: Delete conversations when no longer needed.
- **Markdown Formatting**: Responses are formatted in markdown for rich text display.
- **Streaming Responses**: Real-time response streaming for better user experience.

## Tech Stack
- **Express.js**.
- **TypeScript**.
- **Groq SDK**: API client for Groq's language models.
- **Redis (Upstash)**: Persistent storage for conversation history. Stores chat interactions on the server-side, allowing the backend to manage and send complete conversation context to the AI model without requiring the frontend to maintain this state.
- **Streaming Responses**: Server-sent events for real-time chat responses.

## Getting Started

### Prerequisites
- Node.js (v14 or higher)

### Installation

1. Clone the repository
2. Create a `.env` file in the root directory with the following variables:
```bash
GROQ_API_KEY=your_groq_api_key
URL_REDIS=your_upstash_redis_url
TOKEN_REDIS=your_upstash_redis_token
```

The server will start on http://localhost:3000

## Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `GROQ_API_KEY` | API key for Groq's LLM service | Yes |
| `URL_REDIS` | URL for Upstash Redis database | Yes |
| `TOKEN_REDIS` | Authentication token for Upstash Redis | Yes |

## How It Works
1. **Chat Generation**:
   - The backend receives a prompt and a unique identifier (UUID) from the client
   - If it's a new conversation, it adds formatting instructions to the conversation history
   - It streams the AI response back to the client in real-time
   - The complete conversation history is stored in Redis for future interactions

2. **Title Generation**:
   - Uses the Groq API to generate a concise, relevant title for the conversation
   - The title is based on the initial prompt and is returned as a single sentence

3. **Conversation Management**:
   - Conversations can be deleted from Redis storage using their UUID

Redis is used for storing conversation history to ensure that conversations are persisted across sessions and can be retrieved as needed. This allows for a seamless user experience and enables the AI chat functionality to build upon previous conversations.

## API Usage Examples

### Generate Chat Completion

```bash
curl -X POST http://localhost:3000/chat/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain quantum computing", "uuid": "generated_uuid"}'
```

### Generate Chat Title

```bash
curl -X POST http://localhost:3000/chat/title \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain quantum computing"}'
```

### Delete Chat History

```bash
curl -X DELETE http://localhost:3000/chat/delete?uuid=generated_uuid
```
