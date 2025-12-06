# Deployment Guide

## Prerequisites

1. Railway.app account
2. Vercel account
3. GitHub repository
4. Docker Desktop

## Backend Deployment (Railway)

### 1. Connect Repository

1. Go to Railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Select the `backend` folder

### 2. Environment Variables

Set the following environment variables in Railway:

```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=<railway_postgres_url>
REDIS_URL=<railway_redis_url>
JWT_SECRET=<your_secret_key>
FRONTEND_URL=<your_frontend_url>
```

### 3. Deploy

Railway will automatically deploy on push to main branch.

## Frontend Deployment (Vercel)

### 1. Connect Repository

1. Go to Vercel
2. Click "Import Project"
3. Connect GitHub repository
4. Set root directory to `frontend`
5. Framework preset: Vite

### 2. Environment Variables

```bash
VITE_API_URL=<your_backend_url>
VITE_SOCKET_URL=<your_backend_url>
```

### 3. Deploy

Vercel will automatically deploy on push to main branch.

## Database

### PostgreSQL Setup

1. Create PostgreSQL database in Railway
2. Run migrations:
   ```bash
   npm run migrate
   ```

### Local Database Backup

```bash
pg_dump -U postgres erp_db > backup.sql
```

## Monitoring

### Logs

- Railway: View logs in dashboard
- Vercel: View logs in dashboard

### Health Checks

- Backend: `/api/health`
- Database: Check connection pool
- Redis: Check connection

## Rollback

### Railway

1. Go to deployment history
2. Select previous successful deployment
3. Click "Redeploy"

### Vercel

1. Go to deployment history
2. Click "..." on previous deployment
3. Select "Promote to Production"

## CI/CD

GitHub Actions workflows handle:
- Linting
- Testing
- Building
- Deployment

See `.github/workflows/` for details.

