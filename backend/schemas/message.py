from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from models.message import Message


class MessageCreate(BaseModel):
    """Schema for sending a new message."""
    content: str = Field(..., min_length=1, max_length=2000)


class MessageResponse(BaseModel):
    """Schema for a message API response."""
    id: UUID
    connection_id: UUID
    sender_id: UUID
    recipient_id: UUID
    content: str
    created_at: datetime

    @classmethod
    def from_model(cls, model: Message) -> "MessageResponse":
        return cls(**model.dict())


class ConnectionPartner(BaseModel):
    """Public info about the other person in a connection."""
    user_id: UUID
    full_name: Optional[str] = None
    profile_picture_url: Optional[str] = None
    role: Optional[str] = None


class MessageThreadResponse(BaseModel):
    """Schema for a full message thread between two users."""
    connection_id: UUID
    partner: ConnectionPartner
    messages: List[MessageResponse]
    total: int