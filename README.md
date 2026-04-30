# SEAL — Process, Inventory & Billing Management

A full-stack MERN (MongoDB excluded) + PostgreSQL + Cloudinary web application for managing product processes, inventory, and billing across multiple workspaces and teams.

---

## Tech Stack

| Layer      | Technology                                |
|------------|-------------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS, React Query |
| Backend    | Node.js, Express.js                       |
| Database   | PostgreSQL (SQL)                          |
| Storage    | Cloudinary (images)                       |
| Auth       | JWT (jsonwebtoken + bcryptjs)             |
| Email      | Nodemailer (for invitations)              |

---

## Features

### Authentication & Workspaces
- Register / Login with JWT
- Create workspaces — creator becomes owner automatically
- Multiple owners per workspace; one user can own multiple workspaces
- Workspace switcher in sidebar
- **Invite employees** via email link (7-day expiry)
- **Employee join requests** — employees search and request to join; any owner can approve/reject

### Products & Processes
- Create products with concept image (Cloudinary), client, assigned member
- Auto-generated product codes (`#101`, `#102`, …)
- Multi-stage process tracking with per-stage assignment
- Owners: full CRUD on products and stages
- Employees: see and update only their assigned stages
- Upload build progress images
- **Save any product's process as a reusable template**

### Process Templates
- Save product stage sequences as workspace-level templates
- Apply templates when creating new products (auto-populates stages)
- Create templates from scratch too

### Inventory Management (Owners only)
- Add/edit/delete raw materials with quantity, unit, supplier, unit price
- Set minimum thresholds with low-stock alerts
- Stock adjustment (add / remove) with validation
- Total inventory value calculation

### Billing (Owners only)
- Create itemised bills linked to products
- Auto-generated bill numbers (`BILL-0001`, `BILL-0002`, …)
- Track status: Draft → Sent → Paid / Overdue
- Bill detail view with line items
- Summary cards: total paid, pending, overdue count

### Employees Tab (Owners only)
- View all workspace members (owners + employees) with stats
- Click member to see their assigned products/stages
- Promote employee to owner or demote owner to employee
- Remove members from workspace

---

## Project Structure

```
seal/
├── backend/
│   ├── config/
│   │   ├── db.js              # PostgreSQL pool
│   │   └── cloudinary.js      # Cloudinary + Multer setup
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── workspaceController.js
│   │   ├── productController.js
│   │   ├── stageController.js
│   │   ├── inventoryController.js
│   │   ├── billingController.js
│   │   ├── employeeController.js
│   │   └── templateController.js
│   ├── db/
│   │   └── schema.sql         # Full PostgreSQL schema
│   ├── middleware/
│   │   └── auth.js            # JWT + role middleware
│   ├── routes/
│   │   ├── auth.js
│   │   ├── workspaces.js      # Workspace CRUD + invites
│   │   └── workspace.js       # Products, stages, inventory, billing, employees
│   ├── server.js
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── axios.js        # Axios instance with interceptors
    │   ├── components/
    │   │   ├── Layout.jsx
    │   │   ├── Sidebar.jsx
    │   │   └── JoinWorkspacePanel.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Products.jsx
    │   │   ├── ProductDetail.jsx
    │   │   ├── MyTasks.jsx
    │   │   ├── Inventory.jsx
    │   │   ├── Billing.jsx
    │   │   ├── Employees.jsx
    │   │   └── AcceptInvite.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## Setup & Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Cloudinary account (free tier works)

### 1. Clone & Install

```bash
# Backend
cd seal/backend
npm install

# Frontend
cd seal/frontend
npm install
```

### 2. PostgreSQL Database

```bash
# Create database
psql -U postgres
CREATE DATABASE seal_db;
\q
```

### 3. Backend Environment Variables

```bash
cd seal/backend
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=seal_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRES_IN=7d

# Cloudinary (get from cloudinary.com dashboard)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email for invitations (optional - Gmail with App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 4. Run the App

```bash
# Terminal 1 — Backend (auto-runs schema migration on startup)
cd seal/backend
npm run dev

# Terminal 2 — Frontend
cd seal/frontend
npm run dev
```

Open: **http://localhost:5173**

The backend auto-applies `db/schema.sql` on every startup (uses `IF NOT EXISTS` so it's safe).

---

## API Overview

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user + workspaces |
| PUT | `/api/auth/profile` | Update name/avatar |

### Workspaces
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/workspaces` | Create workspace |
| GET | `/api/workspaces/search?q=` | Search workspaces |
| POST | `/api/workspaces/join-request` | Request to join |
| POST | `/api/workspaces/accept-invite/:token` | Accept email invite |
| GET | `/api/workspaces/:id` | Dashboard stats |
| POST | `/api/workspaces/:id/invite` | Invite by email (owner) |
| GET | `/api/workspaces/:id/join-requests` | Pending requests (owner) |
| PUT | `/api/workspaces/:id/join-requests/:rid` | Approve/reject (owner) |

### Products, Stages, Inventory, Billing, Templates
All under `/api/workspaces/:workspaceId/...` — see `routes/workspace.js` for full list.

---

## Role Permissions

| Feature | Owner | Employee |
|---------|-------|----------|
| View all products | ✅ | ❌ (own only) |
| Create/edit/delete products | ✅ | ❌ |
| Update stage status | ✅ | ✅ (assigned only) |
| Inventory management | ✅ | View only |
| Billing | ✅ | ❌ |
| View employees | ✅ | ❌ |
| Invite / approve members | ✅ | ❌ |
| Manage templates | ✅ | View only |
