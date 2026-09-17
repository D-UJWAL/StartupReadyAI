from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base
import models, auth, routers
import os

Base.metadata.create_all(bind=engine)

app = FastAPI(title="StartupReady AI Platform API")

# Configure CORS securely, falling back to local dev origins if not provided
cors_origins_env = os.getenv("CORS_ORIGINS")
if cors_origins_env:
    allowed_origins = [origin.strip() for origin in cors_origins_env.split(",")]
else:
    allowed_origins = ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded documents
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
# (Removed insecure static mount for Priority 7)

app.include_router(auth.router)
app.include_router(routers.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to StartupReady AI API"}
