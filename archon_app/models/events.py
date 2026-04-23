"""ARCHON SSE events — same shape as AI-HF for unified frontends."""

from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel


class BaseEvent(BaseModel):
    type: str

    def to_sse(self) -> str:
        return f"event: {self.type.lower()}\ndata: {self.model_dump_json()}\n\n"


class StartEvent(BaseEvent):
    type: Literal["start"] = "start"
    engine: str = "archon"


class ProgressEvent(BaseEvent):
    type: Literal["progress"] = "progress"
    engine: str
    agent: str
    ticker: Optional[str] = None
    status: str
    detail: Optional[str] = None


class CompleteEvent(BaseEvent):
    type: Literal["complete"] = "complete"
    engine: str
    data: Dict[str, Any]


class ErrorEvent(BaseEvent):
    type: Literal["error"] = "error"
    engine: str
    message: str
