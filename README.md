# 🚀 ERP PROJE - AI Destekli Akıllı ERP Yönetim Sistemi

**Versiyon:** 2.0 (Local LLM Edition - Ollama + RAG + Agentic)  
**Status:** Geliştirme (Development)  
**Başlangıç:** Ekim 2025  
**Tahmini Tamamlanma:** Haziran 2026 (8 ay)  
**Tim:** 2 kişi

---

## 📋 İÇİNDEKİLER

1. [Proje Özeti](#proje-özeti)
2. [Hardware & Setup](#hardware--setup)
3. [Tech Stack](#tech-stack)
4. [Task Bölüşümü](#task-bölüşümü)
5. [Başlangıç Rehberi](#başlangıç-rehberi)
6. [Repo Yapısı](#repo-yapısı)
7. [Git Workflow](#git-workflow)
8. [Sohbet Timeline](#sohbet-timeline)
9. [API Endpoints](#api-endpoints)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Proje Özeti

### Amacı
Orta ölçekli şirketlere sunulan, **dışarıya bağımsız** (offline-first), **yapay zeka destekli** ERP sistemi. Tüm veriler sunucuda kalır, hiçbir üçüncü parti API'ye bağımlılık yoktur.

### Hedef Kullanıcılar
- Muhasebe sorumluları
- Stok yöneticileri
- Satış temsilcileri
- Yöneticiler/İşletme müdürleri
- **Ölçek:** 10-100 kişi (scalable)

### Ana Özellikler
```
✅ Ürün Yönetimi (CRUD + Kategoriler)
✅ Stok Takibi (Real-time, reorder alerts)
✅ Satış/Siparişler (Orders, invoices, PDF)
✅ Dashboard & Raporlama (KPIs, charts, export)
✅ AI Chatbot v1 (Q&A, RAG-based)
✅ Email Automation (Orders, alerts, reports)
✅ Authentication & RBAC (3 rol, permission matrix)
✅ Audit Logging (Tüm işlemler kaydedilir)
✅ Real-time Updates (WebSocket)
✅ AI Chatbot v2 (Agentic - Ay 8+)
```

---

## 💻 Hardware & Setup

### Sistem Gereksinimleri

#### **Main Developer (Veri + AI)**
```
✓ Windows 10/11 Pro/Enterprise
✓ CPU: i5-10300H (4 çekirdek, 8 thread) +
✓ GPU: NVIDIA RTX 1650 Ti 4GB VRAM ← Ollama çalışacak
✓ RAM: 32GB (Recommended)
✓ Storage: 1TB SSD (Model + Database + Cache)
✓ Internet: 100+ Mbps (Model download için)
```

#### **Secondary Developer (Efe - Frontend/DevOps)**
```
✓ Mac/Windows/Linux (Herhangi biri)
✓ RAM: 16GB minimum, 32GB recommended
✓ Storage: 500GB SSD
✓ Internet: 100+ Mbps
```

### Lokal Kaynaklar (Windows Makinede)
```
PostgreSQL (5432)     → Database server
Redis (6379)          → Cache + Queue
Ollama (11434)        → Local LLM
Node.js (5000)        → Backend API
React Dev (3000)      → Frontend dev server
```

---

## 🛠️ Tech Stack

### Frontend
```
- React 18.2.0 + Vite 5.0.0
  → Lightning-fast dev server, production build
  
- Tailwind CSS 3.4.0 + Shadcn/ui
  → Modern component library, responsive design
  
- Zustand 4.4.0
  → Lightweight state management
  
- Socket.io Client 4.7.0
  → Real-time WebSocket connection
  
- TanStack Query 5.0.0
  → API caching, background synchronization
  
- Recharts 2.10.0
  → Charts and visualizations
  
- jsPDF 2.5.0 + xlsx 0.18.0
  → PDF/Excel export
  
- Vitest 0.34.0 + React Testing Library
  → Component testing
```

### Backend
```
- Node.js 18 LTS
  → JavaScript runtime
  
- Express.js 4.18.0
  → REST API framework
  
- Socket.io 4.7.0
  → Real-time bidirectional communication
  
- Bull 4.11.0
  → Redis-based job queue
  
- PostgreSQL 14+
  → Relational database
  
- Pgvector 0.4.0
  → Vector embeddings for RAG
  
- Ollama Client
  → Local LLM integration
  
- JWT (jsonwebtoken 9.0.0)
  → Authentication tokens
  
- Bcrypt 5.1.0
  → Password hashing
  
- Winston 3.11.0
  → Logging and monitoring
  
- Joi 17.11.0
  → Input validation
  
- Helmet 7.1.0
  → Security headers
  
- Jest 29.7.0
  → Backend testing
```

### AI/ML
```
- Ollama
  → LLM runner, model management
  
- Llama 2 7B (Quantized)
  → Base open-source model
  
- sentence-transformers
  → Embeddings generation
  
- LoRA (QLoRA)
  → Efficient fine-tuning
  
- Pgvector
  → Vector similarity search
```

### DevOps & Deployment
```
- Docker & Docker Compose
  → Containerization, local testing
  
- Railway.app
  → Backend + PostgreSQL hosting
  
- Vercel
  → Frontend hosting
  
- GitHub Actions
  → CI/CD pipeline
  
- Winston + Pino
  → Logging and monitoring
```

---

## 👥 Task Bölüşümü

### SEN (Windows - Backend + AI Owner)

**Sorumluluk Alanları:**
```
✅ PostgreSQL Database (schema, migrations)
✅ Redis Cache & Queue
✅ Ollama Integration (Local LLM)
✅ RAG System (embeddings, retrieval)
✅ Backend API (Express.js)
✅ WebSocket Events
✅ Authentication & RBAC
✅ Email Queue System
✅ Fine-tuning Pipeline (Ay 5-6)
✅ Backend Testing
✅ Monitoring & Logging
```

**Yazacağın Dosyalar (~3500+ satır):**
```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          (PostgreSQL connection)
│   │   ├── ollama.js            (Ollama setup)
│   │   ├── redis.js             (Redis client)
│   │   └── env.js               (Environment variables)
│   ├── middleware/
│   │   ├── auth.js              (JWT verification)
│   │   ├── rbac.js              (Role-based access)
│   │   ├── errorHandler.js      (Error handling)
│   │   ├── logger.js            (Winston logging)
│   │   └── rateLimit.js         (Rate limiting)
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   ├── RAGKnowledge.js
│   │   └── AuditLog.js
│   ├── routes/
│   │   ├── auth.js              (Auth endpoints)
│   │   ├── products.js          (Product CRUD)
│   │   ├── orders.js            (Order management)
│   │   ├── chat.js              (Chatbot)
│   │   ├── reports.js           (Reporting)
│   │   └── admin.js             (Admin panel)
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── orderController.js
│   │   └── chatController.js
│   ├── services/
│   │   ├── aiService.js         (Ollama calls)
│   │   ├── ragService.js        (RAG retrieval)
│   │   ├── emailService.js      (Email sending)
│   │   ├── cacheService.js      (Redis)
│   │   └── reportService.js     (Report generation)
│   ├── websocket/
│   │   ├── events.js            (Socket.io events)
│   │   └── handlers.js          (Event handlers)
│   └── utils/
│       ├── validators.js        (Joi schemas)
│       ├── formatters.js        (Data formatting)
│       ├── prompts.js           (AI system prompts)
│       └── helpers.js           (Utility functions)
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_products.sql
│   ├── 003_create_orders.sql
│   ├── 004_create_rag_knowledge.sql
│   ├── 005_create_audit_logs.sql
│   ├── 006_pgvector_extension.sql
│   └── ... (10 total)
├── tests/
│   ├── auth.test.js
│   ├── products.test.js
│   └── api.test.js
├── scripts/
│   ├── setup-ollama.js
│   ├── seed-data.js
│   └── fine-tuning.py
└── server.js

Total: ~3500 lines of code
```

---

### EFE (Frontend + DevOps)

**Sorumluluk Alanları:**
```
✅ React Frontend (Vite)
✅ UI Components (Tailwind + Shadcn)
✅ State Management (Zustand)
✅ API Integration
✅ WebSocket Client
✅ Pages & Routes
✅ Responsive Design
✅ Frontend Testing
✅ Docker & Containerization
✅ CI/CD Pipeline
✅ Infrastructure (Railway, Vercel)
✅ Documentation (DevOps)
```

**Yazacağın Dosyalar (~2500+ satır):**
```
frontend/
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── LoginForm.jsx
│   │   │   └── RegisterForm.jsx
│   │   ├── Dashboard/
│   │   │   ├── KPIWidget.jsx
│   │   │   ├── Chart.jsx
│   │   │   └── ReportGenerator.jsx
│   │   ├── Products/
│   │   │   ├── ProductList.jsx
│   │   │   ├── ProductForm.jsx
│   │   │   └── StockAlert.jsx
│   │   ├── Orders/
│   │   │   ├── OrderList.jsx
│   │   │   ├── OrderForm.jsx
│   │   │   └── InvoiceView.jsx
│   │   ├── Chat/
│   │   │   ├── ChatBox.jsx
│   │   │   ├── MessageItem.jsx
│   │   │   └── InputArea.jsx
│   │   └── Common/
│   │       ├── Header.jsx
│   │       ├── Sidebar.jsx
│   │       └── Layout.jsx
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── ProductsPage.jsx
│   │   ├── OrdersPage.jsx
│   │   ├── ChatPage.jsx
│   │   ├── ReportsPage.jsx
│   │   └── AdminPage.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useSocket.js
│   │   └── useAPI.js
│   ├── services/
│   │   ├── api.js               (API calls)
│   │   └── socket.js            (WebSocket)
│   ├── store/
│   │   ├── authStore.js
│   │   ├── productStore.js
│   │   └── uiStore.js
│   └── utils/
│       ├── constants.js
│       ├── formatters.js
│       └── validators.js
├── tests/
│   ├── components.test.js
│   └── pages.test.js
└── index.html

Total: ~2500 lines of code

devops/
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
├── .dockerignore
├── nginx.conf
├── .github/
│   └── workflows/
│       ├── ci.yml               (Testing)
│       └── deploy.yml           (Deployment)
└── scripts/
    ├── deploy.sh
    └── setup.sh
```

---

## 🚀 Başlangıç Rehberi

### Sistem Gereksinimleri Kontrolü

#### **Windows Makinede (SEN)**

```bash
# Node.js 18 LTS
node --version
npm --version

# Git
git --version

# Docker Desktop (Running)
docker --version
docker ps

# PostgreSQL
psql --version
psql -U postgres -c "SELECT version();"

# Redis (Docker)
docker run -d -p 6379:6379 --name redis redis:7-alpine
redis-cli ping  # PONG döndürmelidir

# Ollama
ollama --version
ollama pull llama2
ollama serve  # Başlat ve çalış tutalım
```

#### **Mac/Başka Makinede (EFE)**

```bash
# Node.js 18 LTS
node --version
npm --version

# Git
git --version

# Docker Desktop (Running)
docker --version
```

---

### Proje Kurulumu

#### **1. Repository Klonla**
```bash
cd C:\Users\YourUsername\Desktop
git clone <repo-url>
cd erp-project
```

#### **2. Environment Dosyasını Oluştur**
```bash
# Windows (SEN)
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

Backend `.env`:
```
# Database
DATABASE_URL=postgresql://postgres:secure_password@localhost:5432/erp_db
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secure_password
DB_NAME=erp_db

# Redis
REDIS_URL=redis://localhost:6379

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# JWT
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Server
PORT=5000
NODE_ENV=development

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# AI
AI_MAX_CONTEXT=2000
RAG_TOP_K=5
RAG_THRESHOLD=0.7
```

Frontend `.env`:
```
VITE_API_URL=http://localhost:5000
VITE_API_TIMEOUT=30000
VITE_SOCKET_URL=http://localhost:5000
```

#### **3. Backend Kurulumu (SEN)**
```bash
cd backend
npm install

# Database migrate
npm run migrate

# Seed data
npm run seed

# Server başlat
npm run dev
# Çıktı: Server running on port 5000
```

#### **4. Frontend Kurulumu (EFE)**
```bash
cd frontend
npm install

# Dev server başlat
npm run dev
# Çıktı: Local: http://localhost:3000
```

#### **5. Docker Kurulumu (EFE)**
```bash
# Windows makinede birisi çalıştırırsa (SEN)
docker-compose up -d
# PostgreSQL + Redis başlatılır

# Her iki developer
docker ps  # Kontrol et
```

---

## 📁 Repo Yapısı

```
erp-project/
│
├── backend/                    ← SEN (Node.js + Ollama)
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── websocket/
│   │   └── utils/
│   ├── migrations/             ← Database schema
│   ├── tests/                  ← Backend tests
│   ├── scripts/                ← Automation
│   ├── .env.example
│   ├── package.json
│   ├── server.js
│   └── Dockerfile
│
├── frontend/                   ← EFE (React)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   └── utils/
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile
│   └── index.html
│
├── devops/                     ← EFE (Infrastructure)
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── nginx.conf
│   ├── .github/
│   │   └── workflows/
│   │       ├── ci.yml
│   │       └── deploy.yml
│   └── scripts/
│       ├── deploy.sh
│       └── setup.sh
│
├── docs/                       ← İKİSİ (Documentation)
│   ├── API.md                  ← SEN writes
│   ├── ARCHITECTURE.md
│   ├── SETUP.md
│   ├── DEPLOYMENT.md           ← EFE writes
│   ├── FRONTEND.md             ← EFE writes
│   ├── FINE_TUNING.md          ← SEN writes
│   └── TROUBLESHOOTING.md
│
├── scripts/                    ← SEN (Automation)
│   ├── setup-ollama.js
│   ├── seed-data.js
│   ├── fine-tuning.py
│   └── migrate-db.js
│
├── .env.example                ← Template
├── .gitignore
├── docker-compose.yml          ← SHARED
├── README.md                   ← Bu dosya
└── package.json                ← Root (optional)
```

---

## 🔄 Git Workflow

### Branch Strategy

```
main (production)
  ↓
dev (development - stable)
  ├─ sen/backend-feature
  ├─ sen/ai-rag
  ├─ efe/frontend-feature
  ├─ efe/ui-components
  └─ feature/shared (beraber)
```

### Commit Convention

```
Format: <type>(<scope>): <subject>

Types:
  feat:     Yeni feature
  fix:      Bug fix
  refactor: Code restructuring
  test:     Test ekleme/değiştirme
  docs:     Documentation
  style:    Code formatting
  perf:     Performance optimization

Örnekler:
  feat(backend): ollama integration
  feat(ui): chat component
  fix(auth): jwt expiry issue
  refactor(db): query optimization
  test(api): product endpoints
  docs(deployment): railway setup
```

### Daily Workflow

```bash
# Sabah başlarken
git pull origin dev
npm install  # Yeni dependencies varsa

# Gün boyunca (kendi branch'inde)
git checkout -b sen/feature-name
# Code yaz
git add .
git commit -m "feat(backend): açıklama"
git push origin sen/feature-name

# PR oluştur, code review, merge
```

### Weekly Merge

```bash
# SEN: Backend merge
git checkout dev
git merge sen/current-week-feature
git push origin dev

# EFE: Frontend merge
git checkout dev
git merge efe/current-week-feature
git push origin dev

# Beraber: Testing + Main merge
git checkout main
git merge dev
git push origin main
```

---

## 📅 Sohbet Timeline

### **AY 1 (Hafta 1-4) - KURULUM**

| Sohbet | Başlık | SEN % | EFE % | Çıktı |
|--------|--------|-------|-------|-------|
| 1 | Planning v2.0 | 20 | 20 | Approved roadmap |
| 2 | Backend Setup | 80 | 20 | Server running |
| 3 | Database | 100 | - | Schema ready |
| 4 | Authentication | 60 | 40 | Auth working |

**MVP Status:** Foundation ready ✅

---

### **AY 2 (Hafta 5-8) - AI + FRONTEND**

| Sohbet | Başlık | SEN % | EFE % | Çıktı |
|--------|--------|-------|-------|-------|
| 5 | Ollama + RAG | 100 | - | AI core ready |
| 6 | Chatbot UI | 20 | 80 | Chat working |
| 7 | Products | 50 | 50 | CRUD done |
| 8 | Orders | 50 | 50 | Orders working |

**MVP Status:** Core features ✅

---

### **AY 3 (Hafta 9-12) - ANALYTICS + EMAIL**

| Sohbet | Başlık | SEN % | EFE % | Çıktı |
|--------|--------|-------|-------|-------|
| 9 | Dashboard | 20 | 80 | Dashboard live |
| 10 | Email | 100 | - | Queue working |
| 11 | Fine-tuning | 100 | - | Model v1 ready |
| - | MVP Testing | 50 | 50 | 80% tests pass |

**MVP Status:** MVP Complete ✅

---

### **AY 4 (Hafta 13-16) - DEPLOYMENT PREP**

| Sohbet | Başlık | SEN % | EFE % | Çıktı |
|--------|--------|-------|-------|-------|
| 12 | Docker | 30 | 70 | Containers ready |
| 13 | Security | 60 | 40 | Production secure |
| 14 | Testing | 50 | 50 | 85%+ coverage |
| - | Bug fixes | 50 | 50 | Production ready |

**MVP Status:** DEMO READY 🎉

---

### **AY 5-8 (Hafta 17-34) - ADVANCED + DEPLOYMENT**

| Hafta | Başlık | SEN | EFE |
|-------|--------|-----|-----|
| 17-20 | Fine-tuning v2 | 100% | - |
| 17-20 | Production Deploy | 30% | 70% |
| 21-24 | Performance Opt. | 50% | 50% |
| 25-28 | Agentic Chatbot | 100% | - |
| 29-32 | Advanced Features | 50% | 50% |
| 33-34 | Final Docs | 40% | 60% |

**Final Status:** Production Ready + Presentation Ready 🚀

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register       - Kullanıcı kaydı
POST   /api/auth/login          - Giriş
POST   /api/auth/refresh        - Token yenile
POST   /api/auth/logout         - Çıkış
POST   /api/auth/reset-password - Şifre sıfırla
```

### Products
```
GET    /api/products            - Ürünleri listele
GET    /api/products/:id        - Ürün detayı
POST   /api/products            - Ürün oluştur
PUT    /api/products/:id        - Ürün güncelle
DELETE /api/products/:id        - Ürün sil
POST   /api/products/:id/stock  - Stok güncelle
```

### Orders
```
GET    /api/orders              - Siparişleri listele
GET    /api/orders/:id          - Sipariş detayı
POST   /api/orders              - Sipariş oluştur
PUT    /api/orders/:id          - Sipariş güncelle
DELETE /api/orders/:id          - Sipariş sil
GET    /api/orders/:id/invoice  - Fatura indir (PDF)
```

### Chat (AI)
```
POST   /api/chat/message        - Chat gönder
GET    /api/chat/history        - Chat geçmişi
POST   /api/chat/rag            - RAG retrieval
```

### Reports
```
GET    /api/reports/daily       - Günlük rapor
GET    /api/reports/weekly      - Haftalık rapor
GET    /api/reports/monthly     - Aylık rapor
GET    /api/reports/export      - Excel/PDF export
```

### WebSocket Events
```
connect         - Bağlantı başladı
disconnect      - Bağlantı koptu
message         - Chat mesajı
product:update  - Ürün güncellemesi
order:create    - Sipariş oluşturuldu
stock:alert     - Stok alarmı
```

---

## 🚀 Deployment

### Local Testing
```bash
# Windows (SEN)
cd backend && npm run dev    # Terminal 1
cd frontend && npm run dev   # Terminal 2
ollama serve                 # Terminal 3

# Browser
open http://localhost:3000
```

### Docker Deployment
```bash
# Build
docker-compose build

# Run
docker-compose up -d

# Check
docker-compose ps
docker logs erp_backend
docker logs erp_frontend
```

### Production Deployment

#### Backend (Railway.app)
```bash
# Railway'e push (Git integration)
git push railway main

# Environment variables set in Railway dashboard
# Automatic deployment on git push
```

#### Frontend (Vercel)
```bash
# Vercel CLI
npm i -g vercel
vercel

# Connect GitHub repo
# Automatic deployment on git push
```

#### Database Backup
```bash
# PostgreSQL backup
pg_dump -U postgres erp_db > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres erp_db < backup_20251026.sql
```

---

## 🐛 Troubleshooting

### Ollama Sorunları

**Problem:** Ollama model yüklenmiyor
```bash
# Çözüm
ollama pull llama2
ollama serve
```

**Problem:** GPU memory yetmiyor
```bash
# Quantized model kullan (daha küçük)
ollama pull llama2:7b-q4

# Veya model swap
ollama pull mistral:7b-q4
```

### PostgreSQL Sorunları

**Problem:** Connection refused
```bash
# PostgreSQL çalışıyor mu?
psql -U postgres -c "SELECT 1"

# Yoksa başlat (Windows)
"C:\Program Files\PostgreSQL\14\bin\pg_ctl" -D "C:\Program Files\PostgreSQL\14\data" start
```

**Problem:** Database exists
```bash
# Drop ve recreate
psql -U postgres -c "DROP DATABASE IF EXISTS erp_db"
npm run migrate
npm run seed
```

### Redis Sorunları

**Problem:** Redis connection refused
```bash
# Docker'da çalışıyor mu?
docker ps | grep redis

# Yoksa başlat
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Test
redis-cli ping  # PONG döndürmelidir
```

### Frontend Sorunları

**Problem:** Blank page
```bash
# Console'u aç (F12)
# Check network tab
# VITE_API_URL doğru mu?
# Backend çalışıyor mu?
```

**Problem:** Socket.io connection failed
```bash
# Backend Socket.io listening mi?
# CORS settings doğru mu?
# Firewall izin veriyor mu?
```

---

## 📖 Dökümentasyon

Detaylı dökümentasyon:
- **API.md** - API endpoints ve response examples
- **ARCHITECTURE.md** - System design ve data flow
- **SETUP.md** - Detailed setup instructions
- **DEPLOYMENT.md** - Production deployment guide
- **FRONTEND.md** - React component structure
- **FINE_TUNING.md** - Model fine-tuning process
- **TROUBLESHOOTING.md** - Common issues and solutions

---

## 🤝 Katkı Yapma

### Code Review Process
1. Fork → Feature branch → Pull Request
2. Code review by the other developer
3. Tests must pass (85%+ coverage)
4. Approved → Merge to dev
5. Weekly merge to main

### Testing
```bash
# Backend
cd backend
npm run test           # Jest tests
npm run test:coverage  # Coverage report

# Frontend
cd frontend
npm run test           # Vitest
npm run test:coverage  # Coverage report
```

### Linting & Formatting
```bash
# Backend
npm run lint
npm run format

# Frontend
npm run lint
npm run format
```

---

## 📞 İletişim & Destek

### Daily Standup (15 min)
- What did you do yesterday?
- What will you do today?
- Any blockers?

### Weekly Sync (1 hour)
- Demo what we built
- Integration testing
- Next week planning
- Issues discussion

### Slack/Discord
- Quick questions
- PR notifications
- Deployment alerts

---

## 📊 Progress Tracking

| Hafta | SEN (Backend) | EFE (Frontend) | Status |
|-------|---------------|-------------------|--------|
| 1 | Planning ✅ | Planning ✅ | 🟢 On track |
| 2 | Backend setup | Repo setup | 🟢 On track |
| 3 | Database | UI prep | 🟢 On track |
| ... | ... | ... | ... |

Daha detaylı progress tracking GitHub Projects'te yapılacak.

---

## 📝 License

Proprietary - All rights reserved

---

## 🎯 Sonraki Adımlar

1. **Repo oluştur** (GitHub)
2. **Bu README'i ekle**
3. **SOHBET 1'e başla** (Planning)
4. **Kurulumları tamamla** (Her biri)
5. **SOHBET 2'ye başla** (Backend Setup)

---

**Created:** October 26, 2025  
**Last Updated:** October 26, 2025  
**Version:** 2.0 (Local LLM Edition)

🚀 **Başlamaya hazır? SOHBET 1'den başlayalım!**