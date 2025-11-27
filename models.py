from sqlmodel import SQLModel, Field

class SessionResult(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    poem: str
    wpm: int
    accuracy: int
    mistakes: int
    duration_sec: int
