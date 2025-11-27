from pydantic import BaseModel

class SessionCreate(BaseModel):
    poem: str
    wpm: int
    accuracy: int
    mistakes: int
    duration_sec: int

class SessionRead(SessionCreate):
    id: int
