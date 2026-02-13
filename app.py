from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List
from math import ceil

from database import init_db, get_session
from models import SessionResult
from schemas import SessionCreate, SessionRead

app = FastAPI(title="KeyBeat Backend")

# ----- CORS -----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # lock this down in prod if you want
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- Startup -----
@app.on_event("startup")
def on_startup():
    init_db()

# ----- Create a session result -----
@app.post("/session", response_model=SessionRead)
def create_session(data: SessionCreate, session: Session = Depends(get_session)):
    item = SessionResult(
        poem=data.poem,
        wpm=data.wpm,
        accuracy=data.accuracy,
        mistakes=data.mistakes,
        duration_sec=data.duration_sec,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

# ----- Get paginated sessions -----
@app.get("/sessions")
def get_sessions(
    page: int = 1,
    size: int = 10,
    session: Session = Depends(get_session),
):
    if page < 1:
        page = 1
    if size < 1:
        size = 10

    statement = select(SessionResult).order_by(SessionResult.id.desc())
    all_results = session.exec(statement).all()

    total = len(all_results)
    if total == 0:
        return {
            "items": [],
            "total": 0,
            "page": page,
            "page_size": size,
            "total_pages": 1,
        }

    total_pages = ceil(total / size)
    if page > total_pages:
        page = total_pages

    start = (page - 1) * size
    end = start + size
    items = all_results[start:end]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": size,
        "total_pages": total_pages,
    }

# ----- Root -----
@app.get("/")
def home():
  return {"message": "KeyBeat Solace backend is running!"}


