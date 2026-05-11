from uuid import UUID
from typing import List, Optional
from fastapi import HTTPException, status
from datetime import datetime, timezone

from services.database import supabase
from services.interest import InterestService
from models.mentor import MentorProfile
from models.common import HelpType
from schemas.mentor import MentorProfileCreate, MentorProfileUpdate, MentorProfileResponse


class MentorService:
    """Service for mentor profile operations."""
    
    @staticmethod
    def get_mentor_profile(user_id: UUID) -> MentorProfileResponse:
        """Get mentor profile by user ID."""
        try:
            # Get mentor profile
            result = supabase.table("mentor_profiles").select("*").eq("user_id", str(user_id)).execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Mentor profile not found"
                )
            
            data = result.data[0]
            mentor_id = UUID(data["id"])
            
            # Get interests
            interests_result = supabase.table("mentor_interests").select("interest_id").eq("mentor_profile_id", str(mentor_id)).execute()
            interest_ids = [UUID(row["interest_id"]) for row in interests_result.data]
            interests = InterestService.get_interests_by_ids(interest_ids)
            
            mentor_profile = MentorProfile(
                id=mentor_id,
                user_id=UUID(data["user_id"]),
                industry=data.get("industry"),
                job_title=data.get("job_title"),
                help_types_offered=[HelpType(ht) for ht in data.get("help_types_offered", [])],
                max_requests_per_week=data["max_requests_per_week"],
                interests=interests,
                profile_picture_url=data.get("profile_picture_url"),
                is_active=data.get("is_active", True),
                created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")),
                updated_at=datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00"))
            )
            
            return MentorProfileResponse.from_model(mentor_profile)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching mentor profile: {str(e)}"
            )
    
    @staticmethod
    def get_mentor_profile_by_id(mentor_id: UUID) -> MentorProfileResponse:
        """Get mentor profile by mentor profile ID."""
        try:
            result = supabase.table("mentor_profiles").select("*").eq("id", str(mentor_id)).execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Mentor profile not found"
                )
            
            data = result.data[0]
            profile_id = UUID(data["id"])
            
            # Get interests
            interests_result = supabase.table("mentor_interests").select("interest_id").eq("mentor_profile_id", str(profile_id)).execute()
            interest_ids = [UUID(row["interest_id"]) for row in interests_result.data]
            interests = InterestService.get_interests_by_ids(interest_ids)
            
            mentor_profile = MentorProfile(
                id=profile_id,
                user_id=UUID(data["user_id"]),
                industry=data.get("industry"),
                job_title=data.get("job_title"),
                help_types_offered=[HelpType(ht) for ht in data.get("help_types_offered", [])],
                max_requests_per_week=data["max_requests_per_week"],
                interests=interests,
                profile_picture_url=data.get("profile_picture_url"),
                is_active=data.get("is_active", True),
                created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")),
                updated_at=datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00"))
            )
            
            return MentorProfileResponse.from_model(mentor_profile)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching mentor profile: {str(e)}"
            )
    
    @staticmethod
    def create_mentor_profile(user_id: UUID, profile_data: MentorProfileCreate) -> MentorProfileResponse:
        """Create mentor profile for user."""
        try:
            # Check if profile already exists
            existing = supabase.table("mentor_profiles").select("id").eq("user_id", str(user_id)).execute()
            if existing.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Mentor profile already exists for this user"
                )
            
            # Create mentor profile
            profile_dict = {
                "user_id": str(user_id),
                "industry": profile_data.industry,
                "job_title": profile_data.job_title,
                "help_types_offered": [ht.value for ht in profile_data.help_types_offered],
                "max_requests_per_week": profile_data.max_requests_per_week,
                "profile_picture_url": profile_data.profile_picture_url,
                "is_active": True
            }
            
            result = supabase.table("mentor_profiles").insert(profile_dict).execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create mentor profile"
                )
            
            mentor_id = UUID(result.data[0]["id"])
            
            # Add interests
            if profile_data.interest_ids:
                interest_rows = [{"mentor_profile_id": str(mentor_id), "interest_id": str(iid)} for iid in profile_data.interest_ids]
                supabase.table("mentor_interests").insert(interest_rows).execute()
            
            # Return created profile
            return MentorService.get_mentor_profile_by_id(mentor_id)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating mentor profile: {str(e)}"
            )
    
    @staticmethod
    def update_mentor_profile(user_id: UUID, update_data: MentorProfileUpdate) -> MentorProfileResponse:
        """Update mentor profile."""
        try:
            # Get existing profile
            result = supabase.table("mentor_profiles").select("id").eq("user_id", str(user_id)).execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Mentor profile not found"
                )
            
            mentor_id = UUID(result.data[0]["id"])
            
            # Build update dict
            update_dict = {}
            if update_data.industry is not None:
                update_dict["industry"] = update_data.industry
            if update_data.job_title is not None:
                update_dict["job_title"] = update_data.job_title
            if update_data.help_types_offered is not None:
                update_dict["help_types_offered"] = [ht.value for ht in update_data.help_types_offered]
            if update_data.max_requests_per_week is not None:
                update_dict["max_requests_per_week"] = update_data.max_requests_per_week
            if update_data.profile_picture_url is not None:
                update_dict["profile_picture_url"] = update_data.profile_picture_url
            if update_data.is_active is not None:
                update_dict["is_active"] = update_data.is_active
            
            if update_dict:
                update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
                supabase.table("mentor_profiles").update(update_dict).eq("id", str(mentor_id)).execute()
            
            # Update interests if provided
            if update_data.interest_ids is not None:
                # Delete existing interests
                supabase.table("mentor_interests").delete().eq("mentor_profile_id", str(mentor_id)).execute()
                
                # Add new interests
                if update_data.interest_ids:
                    interest_rows = [{"mentor_profile_id": str(mentor_id), "interest_id": str(iid)} for iid in update_data.interest_ids]
                    supabase.table("mentor_interests").insert(interest_rows).execute()
            
            # Return updated profile
            return MentorService.get_mentor_profile_by_id(mentor_id)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error updating mentor profile: {str(e)}"
            )
    
    @staticmethod
    def browse_mentors(
        user_id: UUID,
        help_type: Optional[HelpType] = None,
        industry: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[MentorProfileResponse]:
        """Browse active mentors, excluding those with existing connections/requests."""
        try:
            # Get user_ids of mentors that user already has pending/accepted requests with
            # Note: mentor_id in requests/connections tables is already a user_id
            requests_result = supabase.table("mentorship_requests").select("mentor_id").eq("mentee_id", str(user_id)).in_("status", ["pending", "accepted"]).execute()
            excluded_user_ids = {UUID(row["mentor_id"]) for row in requests_result.data}
            
            # Also check connections
            connections_result = supabase.table("connections").select("mentor_id").eq("mentee_id", str(user_id)).execute()
            excluded_user_ids.update({UUID(row["mentor_id"]) for row in connections_result.data})
            
            # Build query for active mentors
            query = supabase.table("mentor_profiles").select("id").eq("is_active", True)
            
            if help_type:
                query = query.contains("help_types_offered", [help_type.value])
            
            if industry:
                query = query.eq("industry", industry)
            
            # Exclude mentors with existing connections/requests
            if excluded_user_ids:
                query = query.not_.in_("user_id", [str(uid) for uid in excluded_user_ids])
            
            query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
            result = query.execute()
            
            mentors = []
            for data in result.data:
                mentor_id = UUID(data["id"])
                mentor = MentorService.get_mentor_profile_by_id(mentor_id)
                mentors.append(mentor)
            
            return mentors
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error browsing mentors: {str(e)}"
            )

