from uuid import UUID
from typing import Tuple, Optional
from fastapi import HTTPException, status
from datetime import datetime

from services.database import supabase
from models.message import Message
from schemas.message import (
    MessageCreate,
    MessageResponse,
    MessageThreadResponse,
    ConnectionPartner,
)


class MessageService:
    """Service for direct messages between connected users."""

    @staticmethod
    def _find_connection(user_a: UUID, user_b: UUID) -> Optional[dict]:
        """Find an accepted connection between two users (in either direction)."""
        a, b = str(user_a), str(user_b)
        # connections.mentor_id and mentee_id are user_ids
        result = (
            supabase.table("connections")
            .select("*")
            .or_(
                f"and(mentor_id.eq.{a},mentee_id.eq.{b}),"
                f"and(mentor_id.eq.{b},mentee_id.eq.{a})"
            )
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    @staticmethod
    def _row_to_message(data: dict) -> Message:
        return Message(
            id=UUID(data["id"]),
            connection_id=UUID(data["connection_id"]),
            sender_id=UUID(data["sender_id"]),
            recipient_id=UUID(data["recipient_id"]),
            content=data["content"],
            created_at=datetime.fromisoformat(
                data["created_at"].replace("Z", "+00:00")
            ),
        )

    @staticmethod
    def _load_partner(other_user_id: UUID) -> ConnectionPartner:
        """Look up a partner's display info from user_profiles + role profiles."""
        partner = ConnectionPartner(user_id=other_user_id)

        user_result = (
            supabase.table("user_profiles")
            .select("full_name, role")
            .eq("id", str(other_user_id))
            .limit(1)
            .execute()
        )
        if user_result.data:
            partner.full_name = user_result.data[0].get("full_name")
            partner.role = user_result.data[0].get("role")

        # Profile picture lives on the role-specific profile.
        for table in ("mentor_profiles", "mentee_profiles"):
            pic_result = (
                supabase.table(table)
                .select("profile_picture_url")
                .eq("user_id", str(other_user_id))
                .limit(1)
                .execute()
            )
            if pic_result.data and pic_result.data[0].get("profile_picture_url"):
                partner.profile_picture_url = pic_result.data[0]["profile_picture_url"]
                break

        return partner

    @staticmethod
    def get_thread(
        user_id: UUID,
        other_user_id: UUID,
        limit: int = 100,
        offset: int = 0,
    ) -> MessageThreadResponse:
        """Return the message thread between current user and other user."""
        if user_id == other_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot fetch a thread with yourself",
            )

        connection = MessageService._find_connection(user_id, other_user_id)
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No accepted connection with this user",
            )

        connection_id = UUID(connection["id"])

        result = (
            supabase.table("messages")
            .select("*")
            .eq("connection_id", str(connection_id))
            .order("created_at", desc=False)
            .range(offset, offset + limit - 1)
            .execute()
        )

        messages = [
            MessageResponse.from_model(MessageService._row_to_message(row))
            for row in (result.data or [])
        ]

        partner = MessageService._load_partner(other_user_id)

        return MessageThreadResponse(
            connection_id=connection_id,
            partner=partner,
            messages=messages,
            total=len(messages),
        )

    @staticmethod
    def send_message(
        user_id: UUID,
        other_user_id: UUID,
        payload: MessageCreate,
    ) -> MessageResponse:
        """Send a message from current user to the other user in the connection."""
        if user_id == other_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot message yourself",
            )

        connection = MessageService._find_connection(user_id, other_user_id)
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No accepted connection with this user",
            )

        content = payload.content.strip()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty",
            )

        row = {
            "connection_id": connection["id"],
            "sender_id": str(user_id),
            "recipient_id": str(other_user_id),
            "content": content,
        }

        try:
            result = supabase.table("messages").insert(row).execute()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send message: {str(e)}",
            )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send message",
            )

        return MessageResponse.from_model(
            MessageService._row_to_message(result.data[0])
        )