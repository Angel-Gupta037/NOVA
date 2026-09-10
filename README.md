# NOVA — Team Productivity Platform

**Plan. Collaborate. Deliver.**

NOVA is a full-stack team project management platform. Teams can create projects, invite members, create and assign tasks, and track progress through a To Do → In Progress → Done workflow.

Built for a full-stack developer internship assessment.

**Live demo:** https://nova-frontend-mjxy6ku0l-angel-gupta037.vercel.app
**API docs:** https://nova-backend-t7ex.onrender.com/docs

---

## Features

- **Authentication** — signup/login with JWT, bcrypt-hashed passwords
- **Projects** — create, view, edit, delete; creator is automatically the project admin
- **Team collaboration** — invite members by email, role-based permissions (admin/member)
- **Task management** — create, assign, edit, delete tasks within a project
- **Progress tracking** — drag-and-drop task board (To Do / In Progress / Done) with a live progress bar
- **Access control** — every project-scoped action checks membership and role server-side, not just hidden in the UI

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI |
| Database | SQLite + SQLAlchemy ORM |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Frontend | HTML, CSS, vanilla JavaScript |
| Backend hosting | Render |
| Frontend hosting | Vercel |

---

## Design Decisions

**Why vanilla JavaScript instead of React?**
This was a deliberate choice given the assignment timeline, not a default. I'm comfortable with FastAPI, SQLite, and vanilla JS/HTML/CSS from a prior full-stack project ([Know Your Author](https://know-your-author.onrender.com)), and prioritized shipping a fully working, well-tested application over introducing a framework's build tooling and learning curve under a tight deadline. React is a planned next step for my upcoming projects — this assessment reflects a judgment call about risk versus polish within the time available, not a skill gap.

**Why FastAPI over Flask/Django?**
Automatic request validation and interactive API documentation (via Pydantic + OpenAPI) with less boilerplate than Flask, and less overhead than Django's ORM/admin tooling, which this project didn't need.

**Why SQLite instead of PostgreSQL?**
Zero-setup and file-based, appropriate for this scale and timeline. SQLAlchemy abstracts the database layer, so migrating to PostgreSQL later is a connection-string change, not a rewrite.

**Why JWT instead of session-based auth?**
The frontend (Vercel) and backend (Render) are deployed on separate origins. JWT is stateless and travels in an `Authorization` header, avoiding the cross-origin cookie complications session auth would introduce.

**Why split deployment (Render + Vercel) instead of one host?**
Mirrors a common real-world pattern — a static frontend on a CDN-friendly host, an API on a server host — rather than serving both from one process.

---

## Project Structure

```
NOVA/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth.py
│   ├── requirements.txt
│   ├── .env.example
│   └── routers/
│       ├── auth_routes.py
│       ├── projects.py
│       └── tasks.py
│
└── frontend/
    ├── index.html
    ├── login.html
    ├── signup.html
    ├── dashboard.html
    ├── project.html
    ├── css/style.css
    └── js/
        ├── config.js
        ├── api.js
        ├── auth.js
        ├── dashboard.js
        └── project.js
```

---

## Running Locally

### Backend

```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env          # then fill in a real SECRET_KEY
uvicorn main:app --reload
```

Backend runs at `http://127.0.0.1:8000`. Interactive API docs at `http://127.0.0.1:8000/docs`.

### Frontend

```bash
cd frontend
python -m http.server 5500
```

Open `http://localhost:5500/login.html` in your browser. Update `js/config.js` with your backend URL if it's not running on the default local port.

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/signup` | Create an account |
| POST | `/login` | Log in, returns JWT |
| GET | `/me` | Current logged-in user |
| POST | `/projects` | Create a project |
| GET | `/projects` | List your projects |
| GET | `/projects/{id}` | Project detail + members |
| PUT | `/projects/{id}` | Edit a project (owner only) |
| DELETE | `/projects/{id}` | Delete a project (owner only) |
| POST | `/projects/{id}/members` | Add a member (admin only) |
| DELETE | `/projects/{id}/members/{user_id}` | Remove a member |
| POST | `/projects/{id}/tasks` | Create a task |
| GET | `/projects/{id}/tasks` | List tasks in a project |
| PATCH | `/projects/{id}/tasks/{task_id}` | Update a task (including status) |
| DELETE | `/projects/{id}/tasks/{task_id}` | Delete a task |

Full interactive documentation is available at `/docs` once the backend is running.

---

## What I'd Add With More Time

- Task comments and an activity/audit log per project
- Due-date reminders/notifications
- Real-time updates via WebSockets instead of manual refresh
- Alembic migrations instead of `create_all()` on startup
