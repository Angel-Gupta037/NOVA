from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
import models  

from routers import auth_routes, projects, tasks

Base.metadata.create_all(bind=engine)

app = FastAPI(title="NOVA API", description="Team Productivity Platform API")


origins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://nova-frontend-ecru.vercel.app",
    "https://nova-frontend-git-main-angel-gupta037.vercel.app",
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
