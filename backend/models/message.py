from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class Message(BaseModel):
    """Domain model matching the messages table."""
    id: UUID
    connection_id: UUID
    sender_id: UUID
    recipient_id: UUID
    content: str
    created_at: datetime