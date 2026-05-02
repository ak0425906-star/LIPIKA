# ✍️ LIPIKA — AI-Powered Handwriting Verification System

LIPIKA is a full-stack educational platform that uses **AI/ML to verify student handwriting authenticity**. When a student submits an assignment, LIPIKA compares their handwriting against a stored reference sample and generates a similarity score — helping teachers detect whether an assignment was genuinely written by the student.

---

## 🎯 What Does LIPIKA Do?

| Feature | Description |
|---------|-------------|
| **Handwriting Verification** | Compares submitted assignments against a student's reference handwriting using a Machine Learning model hosted on Hugging Face |
| **Role-Based Access** | Three roles — **Student**, **Teacher**, **Admin** — each with their own dashboard |
| **Student Dashboard** | Students upload assignment images; first upload becomes their reference handwriting sample |
| **Teacher Dashboard** | Teachers view all student submissions with similarity scores and match types (Strong/Moderate/Weak) |
| **Admin Dashboard** | Admins manage students, view the full student list, and upload training data for the ML model |
| **Secure Authentication** | JWT-based login with password hashing (bcrypt). Users can log in with username or roll number |

---

## 🏗️ Architecture

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
| Tech | Purpose |
|------|---------|
| [React 18](https://reactjs.org/) | UI framework |
| [Vite](https://vitejs.dev/) | Build tool & dev server |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |
| [shadcn/ui](https://ui.shadcn.com/) | UI component library |
| [Framer Motion](https://www.framer.com/motion/) | Animations |
| [React Router](https://reactrouter.com/) | Page routing |
| [Lucide React](https://lucide.dev/) | Icons |

### Backend
| Tech | Purpose |
|------|---------|
| [FastAPI](https://fastapi.tiangolo.com/) | Python web framework (REST API) |
| [SQLAlchemy](https://www.sqlalchemy.org/) | ORM for database operations |
| [Pydantic](https://docs.pydantic.dev/) | Data validation & schemas |
| [python-jose](https://github.com/mpdavis/python-jose) | JWT token generation & verification |
| [passlib + bcrypt](https://passlib.readthedocs.io/) | Password hashing |
| [Gradio Client](https://www.gradio.app/docs/python-client) | Calls the Hugging Face ML API |

### Infrastructure
| Service | Purpose |
|---------|---------|
| [Render](https://render.com/) | Backend hosting |
| [Neon.tech](https://neon.tech/) | PostgreSQL cloud database |
| [Hugging Face Spaces](https://huggingface.co/spaces) | ML model hosting (`thanoxz/ml-api`) |

---

## 📂 Project Structure

```
LIPIKA/
├── src/                        # Frontend (React)
│   ├── pages/
│   │   ├── LoginPage.tsx           # Login with username, password & role
│   │   ├── CreateAccountPage.tsx   # Registration with name, username, roll no, dept
│   │   ├── StudentDashboard.tsx    # Upload assignments, view similarity scores
│   │   ├── TeacherDashboard.tsx    # View all submissions & handwriting match results
│   │   ├── AdminDashboard.tsx      # Manage students, upload training data
│   │   └── UploadAssignmentPage.tsx # Image upload interface
│   ├── lib/
│   │   └── api.ts                  # API client — all backend communication
│   ├── components/                 # Reusable UI components (shadcn/ui)
│   └── hooks/                      # Custom React hooks
│
├── backend/                    # Backend (FastAPI)
│   ├── app/
│   │   ├── main.py                 # FastAPI app, all API routes
│   │   ├── auth.py                 # Authentication (JWT, bcrypt, login/signup logic)
│   │   ├── database.py             # Database connection (SQLAlchemy + Neon)
│   │   ├── models.py               # Database models (User, Assignment)
│   │   ├── schemas.py              # Pydantic request/response schemas
│   │   └── dependencies.py         # Role-based access control middleware
│   ├── requirements.txt            # Python dependencies
│   └── .env.example                # Template for environment variables
│
├── package.json                # Frontend dependencies
├── vite.config.ts              # Vite configuration
├── tailwind.config.ts          # Tailwind CSS configuration
└── index.html                  # Entry HTML file
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [Python](https://www.python.org/) 3.9 or higher
- [Git](https://git-scm.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/ak0425906-star/LIPIKA.git
cd LIPIKA
```

### 2. Setup Frontend

```bash
npm install
npm run dev
```

The frontend will start at `http://localhost:5173`

### 3. Setup Backend

```bash
cd backend

# Create a virtual environment (recommended)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Create your environment file
copy .env.example .env       # Windows
# cp .env.example .env       # Mac/Linux
```

Edit `backend/.env` and add your database credentials:
```env
DATABASE_URL=postgresql://your-user:your-password@your-neon-host/your-database?sslmode=require
JWT_SECRET_KEY=your-secret-key-here
```

Start the backend server:
```bash
uvicorn app.main:app --reload --port 8000
```

The backend will start at `http://localhost:8000`

---

## 🔌 API Endpoints

| Method | Endpoint | Role Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/` | None | Health check — returns server status |
| `POST` | `/signup` | None | Create a new account |
| `POST` | `/login` | None | Login and receive a JWT token |
| `POST` | `/upload-assignment` | Student | Upload an assignment image for verification |
| `GET` | `/teacher/assignments` | Teacher | Get all student submissions with scores |
| `PUT` | `/teacher/assignments/{id}/review` | Teacher | Add feedback/status to a submission |
| `GET` | `/admin/students` | Admin | List all registered students |
| `POST` | `/admin/upload-training-by-roll/{roll}` | Admin | Upload training handwriting data |

---

## 🔐 How Authentication Works

1. **Signup**: User provides name, username, roll number, password, department, and role
2. **Password Storage**: Passwords are hashed using **bcrypt** (never stored in plain text)
3. **Login**: User enters username (or roll number), password, and selects their role
4. **JWT Token**: On successful login, the server returns a JWT token valid for 24 hours
5. **Protected Routes**: Every API call includes the token in the `Authorization: Bearer <token>` header
6. **Role Check**: Backend middleware verifies the user's role before granting access to endpoints

---

## 🧠 How Handwriting Verification Works

1. **First Upload** → Student's handwriting is saved as the **reference sample** (score = 100%)
2. **Subsequent Uploads** → Each new submission is compared against the reference using the ML model
3. **ML Model** → Hosted on Hugging Face (`thanoxz/ml-api`), called via the Gradio Client
4. **Similarity Score** → Returns a percentage indicating how closely the handwriting matches
5. **Match Types**:
   - 🟢 **Strong Match** (≥ 85%) — Handwriting is very likely the same person
   - 🟡 **Moderate Match** (60-84%) — Some similarities detected
   - 🔴 **Weak Match** (< 60%) — Handwriting likely from a different person

---

## 👥 User Roles

### 🎓 Student
- Upload assignment images
- View their similarity scores and match history

### 🧑‍🏫 Teacher
- View all student submissions
- See similarity scores and match types
- Provide feedback on assignments

### 🛡️ Admin
- View all registered students
- Upload reference/training handwriting data for any student by roll number
- Full system management access

---

## 🌐 Deployment

| Component | Hosted On | URL |
|-----------|-----------|-----|
| Backend API | Render | `https://thxanozz.onrender.com` |
| Database | Neon.tech | PostgreSQL (cloud) |
| ML Model | Hugging Face | `thanoxz/ml-api` |

> **Note**: The frontend is configured to use the deployed Render backend by default. To use a local backend, change `API_BASE` in `src/lib/api.ts` to `http://localhost:8000`.

---

## 📝 License

This project is built for educational purposes.

---

## 👨‍💻 Author

**ak0425906-star** — [GitHub Profile](https://github.com/ak0425906-star)