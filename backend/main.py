from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
import models  # noqa: F401 — must be imported so Base knows about these tables

from routers import auth_routes, projects, tasks

# Creates tables if they don't exist yet. Fine for this project;
# a real production app would use Alembic migrations instead.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="NOVA API", description="Team Productivity Platform API")

# Update this list with your actual deployed Vercel URL once you have it.
origins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://nova-frontend-mjxy6ku0l-angel-gupta037.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(projects.router)
app.include_router(tasks.router)


@app.get("/")
def health_check():
    return {"status": "NOVA API is running"}
