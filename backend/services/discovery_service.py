"""
Discovery service for browsing mentors.

Implements the browse-and-request model where mentees can discover
mentors in their industry with random shuffle (dating app style).
"""
from typing import Optional, List, Dict
from uuid import UUID
from fastapi import HTTPException, status
from collections import Counter

from services.database import supabase
from services.profile_service import ProfileService
from models.mentor import MentorProfile
from models.interest import Interest
from models.common import HelpType


class DiscoveryService:
    """Service for mentor discovery and browsing."""

    @staticmethod
    async def browse_mentors(
        mentee_user_id: UUID,
        help_type: Optional[HelpType] = None,
        available_only: bool = False,
        limit: int = 20,
        offset: int = 0
    ) -> dict:
        """
        Browse mentors with random shuffle (dating app style).

        Args:
            mentee_user_id: UUID of the browsing mentee
            help_type: Optional filter for help type offered
            available_only: If True, only show mentors accepting requests
            limit: Max mentors to return (pagination)
            offset: Offset for pagination

        Returns:
            Dict with mentors list and total count

        Raises:
            HTTPException(404): Mentee profile not found
            HTTPException(400): Mentee hasn't set their industry
        """
        # Fetch mentee profile and industry
        mentee = await ProfileService.get_mentee_profile(mentee_user_id)
        if not mentee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mentee profile not found"
            )

        # Check if mentee has industry set (assuming field will be added)
        mentee_industry = getattr(mentee, 'industry', None)
        if not mentee_industry:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please set your industry in your profile first"
            )

        # Query mentor profiles with interests
        query = supabase.table('mentor_profiles')\
            .select('*, mentor_interests(interest:interests(*))')\
            .eq('is_active', True)

        # HARD FILTER: Industry match (case-insensitive)
        query = query.ilike('industry', mentee_industry)

        # OPTIONAL FILTER: Help type
        if help_type:
            query = query.contains('help_types_offered', [help_type.value])

        # Pagination
        query = query.range(offset, offset + limit - 1)

        # Execute query
        result = query.execute()

        # Transform mentors (flatten interests)
        mentors = []
        for data in result.data:
            interest_relations = data.get('mentor_interests', [])
            interests = [
                Interest(**item['interest'])
                for item in interest_relations
                if item.get('interest')
            ]

            # Remove nested field and add flattened interests
            profile_data = {k: v for k, v in data.items() if k != 'mentor_interests'}
            profile_data['interests'] = interests

            mentor = MentorProfile(**profile_data)
            mentors.append(mentor)

        # Batch check availability for all mentors
        mentor_ids = [m.user_id for m in mentors]

        # Single query to count pending requests for ALL mentors
        pending_result = supabase.table('mentorship_requests')\
            .select('mentor_id')\
            .eq('status', 'pending')\
            .in_('mentor_id', [str(mid) for mid in mentor_ids])\
            .execute()

        # Count pending requests per mentor
        pending_counts = Counter([r['mentor_id'] for r in pending_result.data])

        # Build response with availability indicators
        mentor_list = []
        for mentor in mentors:
            pending_count = pending_counts.get(str(mentor.user_id), 0)
            is_available = pending_count < mentor.max_requests_per_week

            # Filter out unavailable if requested
            if available_only and not is_available:
                continue

            mentor_list.append({
                "mentor": mentor,
                "is_available": is_available,
                "pending_requests": pending_count,
                "max_requests": mentor.max_requests_per_week
            })

        return {
            "mentors": mentor_list,
            "total": len(mentor_list)
        }

    @staticmethod
    async def get_mentor_detail(
        mentor_id: UUID,
        mentee_user_id: UUID
    ) -> dict:
        """
        Get full mentor profile with shared interests highlighted.

        Called when a mentee clicks on a mentor to see their full profile
        before sending a request.

        Args:
            mentor_id: UUID of the mentor to view
            mentee_user_id: UUID of the viewing mentee

        Returns:
            Dict with mentor profile, availability, and shared interests

        Raises:
            HTTPException(404): Mentor or mentee profile not found
        """
        # Get mentor and mentee
        mentor = await ProfileService.get_mentor_profile(mentor_id)
        if not mentor or not mentor.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mentor not found or inactive"
            )

        mentee = await ProfileService.get_mentee_profile(mentee_user_id)
        if not mentee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mentee profile not found"
            )
        
        #set of mentee intrests        
        mentee_interest_ids = {i.id for i in mentee.interests}
        #set of mentor intrests
        mentor_interest_ids = {i.id for i in mentor.interests}
        #set of both intrest ids
        shared_interest_ids = mentee_interest_ids & mentor_interest_ids

        # Get the actual Interest objects for shared interests
        shared_interests = [i for i in mentor.interests if i.id in shared_interest_ids]


        # Count pending requests for this mentor
        pending_result = supabase.table('mentorship_requests')\
        .select('id')\
        .eq('mentor_id', str(mentor_id))\
        .eq('status', 'pending')\
        .execute()

        pending_count = len(pending_result.data)
        is_available = pending_count < mentor.max_requests_per_week

        return {
            "mentor": mentor,
            "is_available": is_available,
            "pending_requests": pending_count,
            "max_requests": mentor.max_requests_per_week,
            "shared_interests": shared_interests,
            "total_shared_interests": len(shared_interests)
        }

    @staticmethod
    async def _check_mentor_availability(mentor_id: UUID) -> dict:
        """
        Helper method to check if a mentor is accepting new requests.

        Args:
            mentor_id: UUID of the mentor to check

        Returns:
            Dict with availability status and counts

        Raises:
            HTTPException(404): Mentor not found
        """
        # Get mentor profile
        mentor = await ProfileService.get_mentor_profile(mentor_id)
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mentor not found"
            )

        # Count pending requests
        result = supabase.table('mentorship_requests')\
            .select('id')\
            .eq('mentor_id', str(mentor_id))\
            .eq('status', 'pending')\
            .execute()

        pending_count = len(result.data)

        return {
            "is_available": pending_count < mentor.max_requests_per_week,
            "pending_count": pending_count,
            "max_requests": mentor.max_requests_per_week
        }
