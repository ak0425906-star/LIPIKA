<div align="center">

# ✍️ LIPIKA

### AI-Powered Handwriting Verification System

> *Verify. Authenticate. Trust.*

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech)

---

**LIPIKA** is a full-stack educational platform that uses **AI/ML to verify student handwriting authenticity**.  
When a student submits an assignment, LIPIKA compares their handwriting against a stored reference  
and generates a **similarity score** — helping teachers detect whether an assignment was genuinely written by the student.

</div>

---

## 🆕 Recent Updates

- **🚀 Smart Reference Onboarding**: Enhanced multi-image handwriting baseline collection during registration.
- **📱 Fluid Dashboard Experience**: Refactored Student UI with full-screen subject views and organized assignment tracking.
- **✅ Real-time Verification Feedback**: Clear visual indicators (🟢 Accepted / 🔴 Rejected) for student submissions.
- **📚 Sem 6 Curated Subjects**: Integrated support for Software Testing, Information Security, Computer Networks, and FOSS.

---

## 📌 Key Features

| Feature | Description |
|---------|-------------|
| 🧠 **Handwriting Verification** | Compares submissions against a student's reference handwriting using an ML model on Hugging Face |
| 🔐 **Secure Authentication** | JWT-based login with bcrypt password hashing. Login via username or roll number |
| 👥 **Role-Based Dashboards** | Three roles — **Student**, **Teacher**, **Admin** — each with dedicated dashboards |
| 📁 **Smart Reference Archive** | Multi-image baseline collection with "No Limit" upload during onboarding |
| 📊 **Teacher Review Panel** | Teachers view all submissions with similarity scores, match types, and accept/reject actions |
| 🛡️ **Admin Control Panel** | Admins manage students and upload training data for the ML model |

---

## 🏗️ System Architecture

```
┌─────────────────────┐         ┌─────────────────────┐         ┌──────────────────┐
│                     │  REST   │                     │  SQL    │                  │
│   React Frontend    │◄──────► │   FastAPI Backend    │◄──────► │  Neon PostgreSQL  │
│   (Vite + TS)       │  API    │   (Python)          │         │  (Cloud DB)      │
│                     │         │                     │         │                  │
└─────────────────────┘         └────────┬────────────┘         └──────────────────┘
                                         │
                                         │ ML API Call
                                         ▼
                                ┌─────────────────────┐
                                │  Hugging Face Space  │
                                │  (thanoxz/ml-api)    │
                                │  Handwriting Compare │
                                └─────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend

| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| Vite | Build tool & dev server |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| shadcn/ui | Component library |
| Framer Motion | Animations |
| React Router | Page routing |

### Backend

| Technology | Purpose |
|-----------|---------|
| FastAPI | REST API framework |
| SQLAlchemy | ORM for database |
| Pydantic | Data validation |
| python-jose | JWT token handling |
| passlib + bcrypt | Password hashing |
| Gradio Client | Hugging Face ML API calls |

### Infrastructure

| Service | Purpose |
|---------|---------|
| Render | Backend hosting |
| Neon.tech | PostgreSQL cloud database |
| Hugging Face Spaces | ML model hosting (`thanoxz/ml-api`) |

---

## 📂 Project Structure

```
LIPIKA/
├── src/                           # Frontend (React + TypeScript)
│   ├── pages/
│   │   ├── LoginPage.tsx             # Login with username, password & role
│   │   ├── CreateAccountPage.tsx     # Registration form
│   │   ├── StudentDashboard.tsx      # Upload assignments, view scores
│   │   ├── TeacherDashboard.tsx      # Review submissions & match results
│   │   ├── AdminDashboard.tsx        # Manage students & training data
│   │   └── UploadAssignmentPage.tsx  # Image upload interface
│   ├── lib/
│   │   └── api.ts                    # API client (all backend calls)
│   └── components/                   # Reusable UI components
│
├── backend/                       # Backend (FastAPI + Python)
│   ├── app/
│   │   ├── main.py                   # API routes & app config
│   │   ├── auth.py                   # JWT, bcrypt, login/signup logic
│   │   ├── database.py               # Database connection (Neon.tech)
│   │   ├── models.py                 # Database models (User, Assignment)
│   │   ├── schemas.py                # Request/Response schemas
│   │   └── dependencies.py           # Role-based access middleware
│   ├── requirements.txt              # Python dependencies
│   └── .env.example                  # Environment variable template
│
├── LIPIKA_Test_Cases.docx         # Test cases document
├── package.json                   # Frontend dependencies
└── README.md                      # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ → [Download](https://nodejs.org/)
- **Python** 3.9+ → [Download](https://python.org/)
- **Git** → [Download](https://git-scm.com/)

### Step 1 — Clone the Repository

```bash
git clone https://github.com/ak0425906-star/LIPIKA.git
cd LIPIKA
```

### Step 2 — Setup Frontend

```bash
npm install
npm run dev
```

Frontend starts at → `http://localhost:5173`

### Step 3 — Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
copy .env.example .env         # Windows
# cp .env.example .env         # Mac/Linux
```

Edit `backend/.env` with your credentials:

```env
DATABASE_URL=postgresql://user:password@your-neon-host/dbname?sslmode=require
JWT_SECRET_KEY=your-secret-key-here
```

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend starts at → `http://localhost:8000`

> **Note:** The frontend is pre-configured to use the deployed backend at `https://thxanozz.onrender.com`. To use a local backend, update `API_BASE` in `src/lib/api.ts` to `http://localhost:8000`.

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | — | Health check |
| `POST` | `/signup` | — | Create new account |
| `POST` | `/login` | — | Login & get JWT token |
| `POST` | `/upload-assignment` | Student | Upload assignment for verification |
| `GET` | `/teacher/assignments` | Teacher | View all student submissions |
| `PUT` | `/teacher/assignments/{id}/review` | Teacher | Accept/reject a submission |
| `GET` | `/admin/students` | Admin | List all students |
| `POST` | `/admin/upload-training-by-roll/{roll}` | Admin | Upload training data |

---

## 🔐 Authentication Flow

```
User Signup → Password hashed (bcrypt) → Stored in PostgreSQL
     ↓
User Login → Credentials verified → JWT token issued (24hr expiry)
     ↓
API Request → Token sent in header → Role verified → Access granted/denied
```

- Users can log in with **username** or **roll number**
- Passwords are **never stored in plain text**
- Each API endpoint checks the user's **role** before granting access

---

## 🧠 How Handwriting Verification Works

```
Student's First Upload  →  Saved as Reference Sample (score = 100%)
        ↓
Next Upload  →  Compared against reference via ML Model (Hugging Face)
        ↓
Similarity Score Generated  →  Match Type Assigned
```

| Score | Match Type | Meaning |
|-------|-----------|---------|
| ≥ 85% | 🟢 **Strong Match** | Very likely the same person's handwriting |
| 60–84% | 🟡 **Moderate Match** | Some similarities, needs manual review |
| < 60% | 🔴 **Weak Match** | Likely a different person's handwriting |

---

## 👥 User Roles

### 🎓 Student
- Upload assignment images for handwriting verification
- View similarity scores and match history

### 🧑‍🏫 Teacher
- View all student submissions with similarity scores
- Accept or reject assignments based on match results
- Filter by Strong / Moderate / Weak matches

### 🛡️ Admin
- View all registered students
- Upload reference handwriting data for any student
- Full system management access

---

## 🌐 Deployment

| Component | Hosted On |
|-----------|-----------|
| Backend API | [Render](https://render.com) — `https://thxanozz.onrender.com` |
| Database | [Neon.tech](https://neon.tech) — PostgreSQL |
| ML Model | [Hugging Face](https://huggingface.co/spaces) — `thanoxz/ml-api` |

---

## 📝 License

This project is built for educational purposes.

---

<div align="center">

**Built with ❤️ by [ak0425906-star](https://github.com/ak0425906-star)**

</div>