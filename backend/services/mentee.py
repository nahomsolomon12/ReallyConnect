from uuid import UUID
from typing import List, Optional
from fastapi import HTTPException, status
from datetime import datetime, timezone

from services.database import supabase
from services.interest import InterestService
from models.mentee import MenteeProfile
from models.common import HelpType
from schemas.mentee import MenteeProfileCreate, MenteeProfileUpdate, MenteeProfileResponse


class MenteeService:
    """Service for mentee profile operations."""
    
    @staticmethod
    def get_mentee_profile(user_id: UUID) -> MenteeProfileResponse:
        """Get mentee profile by user ID."""
        try:
            result = supabase.table("mentee_profiles").select("*").eq("user_id", str(user_id)).execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Mentee profile not found"
                )
            
            data = result.data[0]
            mentee_id = UUID(data["id"])
            
            # Get interests
            interests_result = supabase.table("mentee_interests").select("interest_id").eq("mentee_profile_id", str(mentee_id)).execute()
            interest_ids = [UUID(row["interest_id"]) for row in interests_result.data]
            interests = InterestService.get_interests_by_ids(interest_ids)
            
            mentee_profile = MenteeProfile(
                id=mentee_id,
                user_id=UUID(data["user_id"]),
                industry=data.get("industry"),
                goals=data.get("goals"),
                help_needed=[HelpType(hn) for hn in data.get("help_needed", [])],
                background=data.get("background"),
                interests=interests,
                profile_picture_url=data.get("profile_picture_url"),
                created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")),
                updated_at=datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00"))
            )
            
            return MenteeProfileResponse.from_model(mentee_profile)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching mentee profile: {str(e)}"
            )
    
    @staticmethod
    def get_mentee_profile_by_id(mentee_id: UUID) -> MenteeProfileResponse:
        """Get mentee profile by mentee profile ID."""
        try:
            result = supabase.table("mentee_profiles").select("*").eq("id", str(mentee_id)).execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Mentee profile not found"
                )
            
            data = result.data[0]
            profile_id = UUID(data["id"])
            
            # Get interests
            interests_result = supabase.table("mentee_interests").select("interest_id").eq("mentee_profile_id", str(profile_id)).execute()
            interest_ids = [UUID(row["interest_id"]) for row in interests_result.data]
            interests = InterestService.get_interests_by_ids(interest_ids)
            
            mentee_profile = MenteeProfile(
                id=profile_id,
                user_id=UUID(data["user_id"]),
                industry=data.get("industry"),
                goals=data.get("goals"),
                help_needed=[HelpType(hn) for hn in data.get("help_needed", [])],
                background=data.get("background"),
                interests=interests,
                profile_picture_url=data.get("profile_picture_url"),
                created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")),
                updated_at=datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00"))
            )
            
            return MenteeProfileResponse.from_model(mentee_profile)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching mentee profile: {str(e)}"
            )
    
    @staticmethod
    def create_mentee_profile(user_id: UUID, profile_data: MenteeProfileCreate) -> MenteeProfileResponse:
        """Create mentee profile for user."""
        try:
            # Check if profile already exists
            existing = supabase.table("mentee_profiles").select("id").eq("user_id", str(user_id)).execute()
            if existing.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Mentee profile already exists for this user"
                )
            
            # Create mentee profile
            profile_dict = {
                "user_id": str(user_id),
                "industry": profile_data.industry,
                "goals": profile_data.goals,
                "help_needed": [hn.value for hn in profile_data.help_needed],
                "background": profile_data.background,
                "profile_picture_url": profile_data.profile_picture_url
            }
            
            result = supabase.table("mentee_profiles").insert(profile_dict).execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create mentee profile"
                )
            
            mentee_id = UUID(result.data[0]["id"])
            
            # Add interests
            if profile_data.interest_ids:
                interest_rows = [{"mentee_profile_id": str(mentee_id), "interest_id": str(iid)} for iid in profile_data.interest_ids]
                supabase.table("mentee_interests").insert(interest_rows).execute()
            
            # Return created profile
            return MenteeService.get_mentee_profile_by_id(mentee_id)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating mentee profile: {str(e)}"
            )
    
    @staticmethod
    def update_mentee_profile(user_id: UUID, update_data: MenteeProfileUpdate) -> MenteeProfileResponse:
        """Update mentee profile."""
        try:
            # Get existing profile
            result = supabase.table("mentee_profiles").select("id").eq("user_id", str(user_id)).execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Mentee profile not found"
                )
            
            mentee_id = UUID(result.data[0]["id"])
            
            # Build update dict
            update_dict = {}
            if update_data.industry is not None:
                update_dict["industry"] = update_data.industry
            if update_data.goals is not None:
                update_dict["goals"] = update_data.goals
            if update_data.help_needed is not None:
                update_dict["help_needed"] = [hn.value for hn in update_data.help_needed]
            if update_data.background is not None:
                update_dict["background"] = update_data.background
            if update_data.profile_picture_url is not None:
                update_dict["profile_picture_url"] = update_data.profile_picture_url
            
            if update_dict:
                update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
                supabase.table("mentee_profiles").update(update_dict).eq("id", str(mentee_id)).execute()
            
            # Update interests if provided
            if update_data.interest_ids is not None:
                # Delete existing interests
                supabase.table("mentee_interests").delete().eq("mentee_profile_id", str(mentee_id)).execute()
                
                # Add new interests
                if update_data.interest_ids:
                    interest_rows = [{"mentee_profile_id": str(mentee_id), "interest_id": str(iid)} for iid in update_data.interest_ids]
                    supabase.table("mentee_interests").insert(interest_rows).execute()
            
            # Return updated profile
            return MenteeService.get_mentee_profile_by_id(mentee_id)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error updating mentee profile: {str(e)}"
            )
    
    @staticmethod
    def browse_mentees(
        user_id: UUID,
        help_needed: Optional[HelpType] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[MenteeProfileResponse]:
        """Browse all mentees."""
        try:
            query = supabase.table("mentee_profiles").select("id")
            
            if help_needed:
                query = query.contains("help_needed", [help_needed.value])
            
            query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
            result = query.execute()
            
            mentees = []
            for data in result.data:
                mentee_id = UUID(data["id"])
                mentee = MenteeService.get_mentee_profile_by_id(mentee_id)
                mentees.append(mentee)
            
            return mentees
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error browsing mentees: {str(e)}"
            )

