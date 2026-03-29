# 🌿 VerdeCrop — Organic Marketplace

Production-ready full-stack organic products marketplace. Farmers sell directly to consumers.

---

## Quick Start (Docker — recommended)

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env with your API keys

# 2. Launch everything
docker compose up --build -d

# App:     http://localhost:3000
# API:     http://localhost:5000
# Swagger: http://localhost:5000/swagger
```

---

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 18 · TypeScript · Vite · Tailwind CSS · Zustand |
| Backend   | ASP.NET Core 8 · C# 12 · Clean Architecture |
| Database  | SQL Server 2022 · Entity Framework Core 8 |
| Cache     | Redis 7 |
| Auth      | JWT + OTP (Twilio SMS / SendGrid Email) |
| Payments  | Razorpay + Stripe + COD |
| Push      | Firebase Cloud Messaging |
| Storage   | Azure Blob Storage |
| Logging   | Serilog |
| Docs      | Swagger / OpenAPI |

---

## Manual Setup

### Backend

```bash
cd backend/VerdeCrop.API

# 1. Edit appsettings.json with your keys
# 2. Create and seed the database
dotnet ef database update
# 3. Run
dotnet run
# → http://localhost:5000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create env file
echo "VITE_API_URL=http://localhost:5000/api" > .env.local

# Start dev server
npm run dev
# → http://localhost:3000
```

---

## Environment Variables

Create `.env` in the project root:

```env
JWT_SECRET=your_super_secret_minimum_32_characters_here

RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

SENDGRID_API_KEY=SG.xxxxxxxxxxxx

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_FROM_NUMBER=+1234567890

AZURE_BLOB_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
```

---

## Project Structure

```
verdecrop/
├── backend/
│   ├── VerdeCrop.Domain/          # Entities
│   ├── VerdeCrop.Application/     # DTOs, Interfaces, Services
│   ├── VerdeCrop.Infrastructure/  # EF Core, Redis, External APIs
│   ├── VerdeCrop.API/             # Controllers, Program.cs
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/            # ui/, layout/, product/
│   │   ├── pages/                 # Home, Products, Auth, Checkout, Orders, Profile, etc.
│   │   ├── services/              # API layer (axios)
│   │   ├── store/                 # Zustand state
│   │   └── types/                 # TypeScript interfaces
│   ├── Dockerfile
│   └── nginx.conf
├── docs/
│   ├── DatabaseSchema.sql
│   └── SeedData.sql
├── docker-compose.yml
└── README.md
```

---

## Default Test Credentials (Development)

| Role   | Identifier              | OTP    |
|--------|-------------------------|--------|
| Admin  | admin@verdecrop.com     | 123456 |
| Farmer | farmer@verdecrop.com    | 123456 |
| User   | +919876543210           | 123456 |

> **Note:** In development mode, any OTP of `123456` is accepted.

---

## API Endpoints

| Method | Endpoint                         | Description           |
|--------|----------------------------------|-----------------------|
| POST   | /api/auth/send-otp               | Send OTP              |
| POST   | /api/auth/verify-otp             | Verify OTP → JWT      |
| POST   | /api/auth/refresh                | Refresh access token  |
| GET    | /api/products                    | List products         |
| GET    | /api/products/featured           | Featured products     |
| GET    | /api/products/{slug}             | Product detail        |
| GET    | /api/cart                        | Get cart              |
| POST   | /api/cart/items                  | Add to cart           |
| POST   | /api/orders                      | Place order           |
| POST   | /api/payments/razorpay/create-order | Create Razorpay order |
| POST   | /api/payments/razorpay/verify    | Verify payment        |
| GET    | /api/admin/dashboard             | Admin stats           |

Full Swagger docs at `/swagger` when running.

---

## Features

- ✅ OTP authentication (SMS + Email)
- ✅ JWT + Refresh token auth with auto-refresh
- ✅ Role-based access (Admin / Farmer / User)
- ✅ Product catalog with advanced filters
- ✅ Redis caching for performance
- ✅ Razorpay + Stripe + COD payments
- ✅ Real-time order tracking
- ✅ Push notifications (Firebase FCM)
- ✅ Farmer onboarding & approval flow
- ✅ Admin dashboard with revenue charts
- ✅ Azure Blob image uploads
- ✅ Rate limiting on auth endpoints
- ✅ Docker + Docker Compose
- ✅ Beautiful, production-grade UI

---

*Built with ❤️ for Indian organic farmers and health-conscious families.*
