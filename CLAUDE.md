# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mellivora Mind Studio is a financial AI research platform focused on mutual fund analysis. It provides two modes:
- **Simple Mode**: Chat-based fund Q&A
- **Deep Research Mode**: NotebookLM-style three-panel interface with document upload, RAG, and report generation

## Tech Stack

- **Frontend**: SolidJS + Solid Router + TailwindCSS
- **Backend**: VoltAgent (TypeScript AI Agent Framework) + Hono
- **Database**: PostgreSQL + pgvector
- **AI Models**: OpenAI / Anthropic Claude / DeepSeek (switchable)

## Project Structure

```
packages/
├── web/          # SolidJS frontend (port 3000)
└── agents/       # VoltAgent backend (port 3141)
```

## Development Commands

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker-compose up -d

# Run both frontend and backend
pnpm dev

# Run frontend only
pnpm --filter @mellivora/web dev

# Run backend only
pnpm --filter @mellivora/agents dev

# Type check
pnpm typecheck

# Build for production
pnpm build
```

## Architecture

### Agent Structure

```
Supervisor Agent
├── Fund Analyst Agent (fund queries, comparison)
├── Report Generator Agent (coming soon)
└── Data Fetcher Agent (coming soon)
```

### Key Files

- `packages/agents/src/server.ts` - API server entry point
- `packages/agents/src/agents/` - Agent definitions
- `packages/agents/src/tools/` - Agent tools (fund-query, etc.)
- `packages/agents/src/db/client.ts` - Database client and schema
- `packages/web/src/pages/SimpleChat.tsx` - Simple chat UI
- `packages/web/src/pages/DeepResearch.tsx` - Three-panel research UI

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Simple chat (non-streaming) |
| `/api/chat/stream` | POST | Simple chat (streaming) |
| `/api/research/chat` | POST | Deep research chat |
| `/health` | GET | Health check |

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mellivora
OPENAI_API_KEY=sk-xxx        # Required for OpenAI
ANTHROPIC_API_KEY=sk-ant-xxx # Required for Claude
DEEPSEEK_API_KEY=sk-xxx      # Required for DeepSeek
```

## Adding New Features

### Adding a New Agent Tool

1. Create tool in `packages/agents/src/tools/`
2. Use Zod for parameter validation
3. Import and add to agent in `packages/agents/src/agents/`

### Adding a New Agent

1. Create agent in `packages/agents/src/agents/`
2. Add as subAgent to Supervisor if needed
3. Expose via API endpoint in `server.ts`

## Database

Tables: `funds`, `documents`, `embeddings`, `conversations`, `kg_nodes`, `kg_edges`

The `embeddings` table uses pgvector for RAG functionality.
