from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict

from routes import users, mentors, mentees, requests, recommendations, ai, interests, messages

# Initialize FastAPI app
app = FastAPI(
    title="ReallyConnect API",
    description="Mentorship matching platform API",
    version="0.1.0"
)

# Configure CORS
# For development: Allow localhost origins
# For production: Update with your deployed frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative React dev server
        "http://127.0.0.1:5173",
        # TODO: Add your production frontend URL here
        # "https://your-app.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(interests.router, prefix="/api/interests", tags=["interests"])
app.include_router(mentors.router, prefix="/api/mentors", tags=["mentors"])
app.include_router(mentees.router, prefix="/api/mentees", tags=["mentees"])
app.include_router(requests.router, prefix="/api/requests", tags=["requests"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["recommendations"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])


@app.get("/")
async def root() -> Dict[str, str]:
    """Root endpoint with API information."""
    return {
        "message": "ReallyConnect API",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}

# TESTING SUPABASE CONNECTION
from services.database import supabase

@app.get("/test-supabase")
async def test_supabase():
    try:
        # Try to query the interests table
        result = supabase.table("interests").select("*").limit(1).execute()
        return {
            "status": "connected",
            "message": "Successfully connected to Supabase!",
            "sample_data": result.data
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to connect: {str(e)}"
        }
