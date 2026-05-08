from fastapi import APIRouter, Depends, Query, status
from uuid import UUID

from middleware.auth import get_current_user
from schemas.message import MessageCreate, MessageResponse, MessageThreadResponse
from services.message import MessageService

router = APIRouter()


@router.get("/{other_user_id}", response_model=MessageThreadResponse)
async def get_thread(
    other_user_id: UUID,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user_id: UUID = Depends(get_current_user),
):
    """Get message thread between current user and other_user_id."""
    return MessageService.get_thread(user_id, other_user_id, limit, offset)


@router.post(
    "/{other_user_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    other_user_id: UUID,
    payload: MessageCreate,
    user_id: UUID = Depends(get_current_user),
):
    """Send a message to other_user_id (must share an accepted connection)."""
    return MessageService.send_message(user_id, other_user_id, payload)