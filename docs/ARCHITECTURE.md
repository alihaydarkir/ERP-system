# System Architecture

## Overview

ERP system with AI chatbot integration using local LLM (Ollama).

## Architecture Diagram

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
│   Port: 3000    │
└────────┬────────┘
         │
         │ HTTP/REST
         │ WebSocket
         │
┌────────▼────────┐
│   Backend       │
│   (Express)     │
│   Port: 5000    │
└────────┬────────┘
         │
    ┌────┴────┬──────────────┐
    │         │              │
┌───▼───┐ ┌───▼──┐     ┌────▼──────┐
│PostgreSQL │Redis │     │  Ollama   │
│ Port:5432│Port:6379 │   │ Port:11434│
└─────────┘ └──────┘     └────────────┘
```

## Components

### Frontend
- React 18 + Vite
- Tailwind CSS + Shadcn/ui
- Zustand (state management)
- Socket.io Client (real-time)
- React Router (routing)

### Backend
- Node.js + Express
- Socket.io (WebSocket)
- PostgreSQL (database)
- Redis (cache + queue)
- Ollama (local LLM)

### DevOps
- Docker Compose
- GitHub Actions (CI/CD)
- Railway.app (backend hosting)
- Vercel (frontend hosting)

## Data Flow

1. User sends request from frontend
2. Backend receives request
3. Middleware checks auth & permissions
4. Controller processes business logic
5. Service layer interacts with database/cache/LLM
6. Response sent back to frontend
7. Real-time updates via WebSocket

## Security

- JWT authentication
- Role-based access control (RBAC)
- Helmet.js security headers
- Rate limiting
- CORS configuration
- Input validation (Joi)

## Database Schema

- users
- products
- orders
- audit_logs
- rag_knowledge

See migrations/ folder for details.

