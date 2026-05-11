from uuid import UUID
from typing import List
from fastapi import HTTPException, status
from datetime import datetime, timezone

from services.database import supabase
from models.request import MentorshipRequest
from models.common import RequestStatus, HelpType
from schemas.request import (
    MentorshipRequestCreate,
    MentorshipRequestResponse,
    MentorshipRequestListResponse
)


class RequestService:
    """Service for mentorship request operations."""
    
    @staticmethod
    def create_request(user_id: UUID, request_data: MentorshipRequestCreate) -> MentorshipRequestResponse:
        """Create a mentorship request (mentee only)."""
        try:
            # Verify user is a mentee
            mentee_profile = supabase.table("mentee_profiles").select("id").eq("user_id", str(user_id)).execute()
            if not mentee_profile.data:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only mentees can create mentorship requests"
                )
            
            # Check for existing pending request with same mentor
            existing = supabase.table("mentorship_requests").select("id").eq("mentee_id", str(user_id)).eq("mentor_id", str(request_data.mentor_id)).eq("status", "pending").execute()
            if existing.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You already have a pending request with this mentor"
                )
            
            # Create request
            request_dict = {
                "mentee_id": str(user_id),
                "mentor_id": str(request_data.mentor_id),
                "help_type": request_data.help_type.value,
                "context": request_data.context,
                "key_questions": request_data.key_questions or [],
                "status": "pending"
            }
            
            result = supabase.table("mentorship_requests").insert(request_dict).execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create mentorship request"
                )
            
            data = result.data[0]
            request = MentorshipRequest(
                id=UUID(data["id"]),
                mentee_id=UUID(data["mentee_id"]),
                mentor_id=UUID(data["mentor_id"]),
                help_type=HelpType(data["help_type"]),
                context=data["context"],
                key_questions=data.get("key_questions") or [],
                status=RequestStatus(data["status"]),
                created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")),
                responded_at=datetime.fromisoformat(data["responded_at"].replace("Z", "+00:00")) if data.get("responded_at") else None
            )
            
            return MentorshipRequestResponse.from_model(request)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating mentorship request: {str(e)}"
            )
    
    @staticmethod
    def get_requests_for_user(user_id: UUID) -> MentorshipRequestListResponse:
        """Get user's mentorship requests (different for mentors vs mentees)."""
        try:
            # Determine if user is mentor or mentee
            mentor_check = supabase.table("mentor_profiles").select("id").eq("user_id", str(user_id)).execute()
            mentee_check = supabase.table("mentee_profiles").select("id").eq("user_id", str(user_id)).execute()
            
            is_mentor = bool(mentor_check.data)
            is_mentee = bool(mentee_check.data)
            
            if not is_mentor and not is_mentee:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User profile not found"
                )
            
            # Get requests based on role
            if is_mentor:
                result = supabase.table("mentorship_requests").select("*").eq("mentor_id", str(user_id)).order("created_at", desc=True).execute()
            else:
                result = supabase.table("mentorship_requests").select("*").eq("mentee_id", str(user_id)).order("created_at", desc=True).execute()
            
            requests = []
            for data in result.data:
                request = MentorshipRequest(
                    id=UUID(data["id"]),
                    mentee_id=UUID(data["mentee_id"]),
                    mentor_id=UUID(data["mentor_id"]),
                    help_type=HelpType(data["help_type"]),
                    context=data["context"],
                    key_questions=data.get("key_questions") or [],
                    status=RequestStatus(data["status"]),
                    created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")),
                    responded_at=datetime.fromisoformat(data["responded_at"].replace("Z", "+00:00")) if data.get("responded_at") else None
                )
                requests.append(MentorshipRequestResponse.from_model(request))
            
            return MentorshipRequestListResponse(requests=requests, total=len(requests))
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching mentorship requests: {str(e)}"
            )
    
    @staticmethod
    def get_request(request_id: UUID, user_id: UUID) -> MentorshipRequestResponse:
        """Get specific mentorship request (must be involved as mentor or mentee)."""
        try:
            result = supabase.table("mentorship_requests").select("*").eq("id", str(request_id)).execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Mentorship request not found"
                )
            
            data = result.data[0]
            request_mentee_id = UUID(data["mentee_id"])
            request_mentor_id = UUID(data["mentor_id"])
            
            # Verify user is involved in this request
            if request_mentee_id != user_id and request_mentor_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have access to this request"
                )
            
            request = MentorshipRequest(
                id=UUID(data["id"]),
                mentee_id=request_mentee_id,
                mentor_id=request_mentor_id,
                help_type=HelpType(data["help_type"]),
                context=data["context"],
                key_questions=data.get("key_questions") or [],
                status=RequestStatus(data["status"]),
                created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")),
                responded_at=datetime.fromisoformat(data["responded_at"].replace("Z", "+00:00")) if data.get("responded_at") else None
            )
            
            return MentorshipRequestResponse.from_model(request)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching mentorship request: {str(e)}"
            )
    
    @staticmethod
    def accept_request(request_id: UUID, user_id: UUID) -> MentorshipRequestResponse:
        """Accept a mentorship request (mentor only)."""
        try:
            # Get the request
            result = supabase.table("mentorship_requests").select("*").eq("id", str(request_id)).execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Mentorship request not found"
                )
            
            data = result.data[0]
            
            # Verify user is the mentor for this request
            if UUID(data["mentor_id"]) != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the mentor can accept this request"
                )
            
            # Check if already responded
            if data["status"] != "pending":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Request has already been responded to"
                )
            
            # Update request status
            update_dict = {
                "status": "accepted",
                "responded_at": datetime.now(timezone.utc).isoformat()
            }
            
            updated_result = supabase.table("mentorship_requests").update(update_dict).eq("id", str(request_id)).execute()
            
            if not updated_result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to accept request"
                )
            
            updated_data = updated_result.data[0]
            
            # Create connection
            connection_dict = {
                "mentor_id": str(user_id),
                "mentee_id": updated_data["mentee_id"],
                "request_id": str(request_id)
            }
            
            # Check if connection already exists (shouldn't, but be safe)
            existing_connection = supabase.table("connections").select("id").eq("mentor_id", str(user_id)).eq("mentee_id", updated_data["mentee_id"]).execute()
            if not existing_connection.data:
                supabase.table("connections").insert(connection_dict).execute()
            
            request = MentorshipRequest(
                id=UUID(updated_data["id"]),
                mentee_id=UUID(updated_data["mentee_id"]),
                mentor_id=UUID(updated_data["mentor_id"]),
                help_type=HelpType(updated_data["help_type"]),
                context=updated_data["context"],
                key_questions=updated_data.get("key_questions") or [],
                status=RequestStatus(updated_data["status"]),
                created_at=datetime.fromisoformat(updated_data["created_at"].replace("Z", "+00:00")),
                responded_at=datetime.fromisoformat(updated_data["responded_at"].replace("Z", "+00:00")) if updated_data.get("responded_at") else None
            )
            
            return MentorshipRequestResponse.from_model(request)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error accepting mentorship request: {str(e)}"
            )
    
    @staticmethod
    def decline_request(request_id: UUID, user_id: UUID) -> MentorshipRequestResponse:
        """Decline a mentorship request (mentor only)."""
        try:
            # Get the request
            result = supabase.table("mentorship_requests").select("*").eq("id", str(request_id)).execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Mentorship request not found"
                )
            
            data = result.data[0]
            
            # Verify user is the mentor for this request
            if UUID(data["mentor_id"]) != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the mentor can decline this request"
                )
            
            # Check if already responded
            if data["status"] != "pending":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Request has already been responded to"
                )
            
            # Update request status
            update_dict = {
                "status": "declined",
                "responded_at": datetime.now(timezone.utc).isoformat()
            }
            
            updated_result = supabase.table("mentorship_requests").update(update_dict).eq("id", str(request_id)).execute()
            
            if not updated_result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to decline request"
                )
            
            updated_data = updated_result.data[0]
            
            request = MentorshipRequest(
                id=UUID(updated_data["id"]),
                mentee_id=UUID(updated_data["mentee_id"]),
                mentor_id=UUID(updated_data["mentor_id"]),
                help_type=HelpType(updated_data["help_type"]),
                context=updated_data["context"],
                key_questions=updated_data.get("key_questions") or [],
                status=RequestStatus(updated_data["status"]),
                created_at=datetime.fromisoformat(updated_data["created_at"].replace("Z", "+00:00")),
                responded_at=datetime.fromisoformat(updated_data["responded_at"].replace("Z", "+00:00")) if updated_data.get("responded_at") else None
            )
            
            return MentorshipRequestResponse.from_model(request)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error declining mentorship request: {str(e)}"
            )

