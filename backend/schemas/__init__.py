# Re-export all schemas for easy importing
from schemas.user import UserProfileUpdate, UserProfileResponse
from schemas.mentor import MentorProfileCreate, MentorProfileUpdate, MentorProfileResponse
from schemas.mentee import MenteeProfileCreate, MenteeProfileUpdate, MenteeProfileResponse
from schemas.request import (
    MentorshipRequestCreate,
    MentorshipRequestResponse,
    MentorshipRequestListResponse
)
from schemas.ai import RequestRewriteRequest, RequestRewriteResponse
from schemas.message import (
    MessageCreate,
    MessageResponse,
    MessageThreadResponse,
    ConnectionPartner,
)

__all__ = [
    # User schemas
    "UserProfileUpdate",
    "UserProfileResponse",
    # Mentor schemas
    "MentorProfileCreate",
    "MentorProfileUpdate",
    "MentorProfileResponse",
    # Mentee schemas
    "MenteeProfileCreate",
    "MenteeProfileUpdate",
    "MenteeProfileResponse",
    # Request schemas
    "MentorshipRequestCreate",
    "MentorshipRequestResponse",
    "MentorshipRequestListResponse",
    # AI schemas
    "RequestRewriteRequest",
    "RequestRewriteResponse",
    # Message schemas
    "MessageCreate",
    "MessageResponse",
    "MessageThreadResponse",
    "ConnectionPartner",
]

