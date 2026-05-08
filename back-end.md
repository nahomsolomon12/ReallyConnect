# ReallyConnect — Backend Explained for Beginners

---

## What Is a Backend?

Think of the app like a restaurant.

- The **frontend** is the dining room — what the customer sees and interacts with (menus, tables, plates).
- The **backend** is the kitchen — hidden from the customer, but responsible for all the real work: storing food, following recipes, deciding who gets what.

When you tap "Sign In" or swipe on a mentor profile, the frontend sends a message to the backend saying *"hey, do this."* The backend checks if it's allowed, talks to the database, does the work, and sends back an answer. The frontend then shows that answer to the user.

---

## The Tech Stack (What Tools Are Being Used)

| Tool | What It Is | Analogy |
|---|---|---|
| **FastAPI** | The framework that runs our backend server | The kitchen's operating system |
| **Python** | The programming language FastAPI is written in | The language the chefs speak |
| **Supabase** | A hosted database + authentication service | The walk-in fridge and the bouncer at the door |
| **Pydantic** | A library that validates data shapes | A checklist that makes sure orders are filled out correctly |
| **httpx** | A library for making HTTP requests from inside Python | The kitchen sending a ticket to a supplier |
| **uvicorn** | The server that actually runs the FastAPI app | The kitchen manager who keeps everything running |

---

## How the Files Are Organized

```
backend/
│
├── main.py              ← The entry point. Starts the server, registers all routes.
│
├── config.py            ← Reads secret keys from the .env file (Supabase credentials).
│
├── middleware/
│   └── auth.py          ← Checks if the user is logged in before letting them through.
│
├── routes/              ← "Menus" — defines what requests the backend accepts.
│   ├── users.py
│   ├── mentors.py
│   ├── mentees.py
│   ├── requests.py
│   ├── recommendations.py
│   ├── interests.py
│   └── ai.py
│
├── services/            ← "Recipes" — the actual logic for doing each task.
│   ├── user.py
│   ├── mentor.py
│   ├── mentee.py
│   ├── request.py
│   ├── recommendation.py
│   ├── interest.py
│   ├── ai.py
│   ├── database.py      ← Creates the Supabase client (the connection to the database).
│   ├── discovery_service.py
│   └── profile_service.py
│
├── models/              ← "Blueprints" — Python classes that describe database objects.
│   ├── user.py
│   ├── mentor.py
│   ├── mentee.py
│   ├── request.py
│   ├── connection.py
│   ├── interest.py
│   └── common.py        ← Shared enums (HelpType, RequestStatus).
│
├── schemas/             ← "Forms" — what data must look like coming in and going out.
│   ├── user.py
│   ├── mentor.py
│   ├── mentee.py
│   ├── request.py
│   └── ai.py
│
└── database/
    └── seed_interests.sql  ← SQL to pre-fill the interests table with 60+ options.
```

**The golden rule of this structure:** a request comes in → hits a **route** → the route calls a **service** → the service talks to the database using **models** → data comes back shaped by a **schema** → the response goes out.

---

## Walking Through Each Layer

---

### 1. `main.py` — The Front Door

This is the first file that runs. It does three things:

**a) Creates the app:**
```python
app = FastAPI(title="ReallyConnect API", version="0.1.0")
```
This creates a web server that will listen for incoming requests.

**b) Configures CORS:**
```python
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)
```
CORS (Cross-Origin Resource Sharing) is a browser security rule. By default, a browser will block your frontend (running on `localhost:5173`) from talking to your backend (running on `localhost:8000`) because they're on different "origins." This middleware tells the browser "it's okay, let them talk."

> ⚠️ `allow_origins=["*"]` means *any* website can talk to this API — fine for development, but must be locked down before going live.

**c) Registers all the routes:**
```python
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(mentors.router, prefix="/api/mentors", tags=["mentors"])
# ... etc
```
This is like publishing a phone directory. Each router is a collection of endpoints, and the `prefix` is the URL path they all share. For example, everything in `mentors.router` is accessible under `/api/mentors/...`.

---

### 2. `config.py` — Secrets Management

```python
class Settings:
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
```

Sensitive values (API keys, database URLs, passwords) are **never** hardcoded in source code — they would be visible to anyone who reads the code or access the repo. Instead, they live in a `.env` file on your local machine and on the server.

`os.getenv("SUPABASE_URL")` reads the value of the `SUPABASE_URL` variable from the environment. The `Settings` class collects all of these in one place and crashes loudly at startup if any required variable is missing — better to fail immediately than to crash mysteriously later.

---

### 3. `middleware/auth.py` — The Bouncer

This file contains a **FastAPI dependency** called `get_current_user`. A dependency is a function that runs automatically before a route function executes — think of it as a pre-check.

**Here's what it does, step by step:**

1. Every request to a protected endpoint must include an `Authorization: Bearer <token>` HTTP header. The token is a JWT (JSON Web Token) that Supabase gave the user when they logged in.
2. The middleware extracts that token.
3. It sends the token to Supabase's own auth API (`/auth/v1/user`) to ask: *"is this token real and not expired?"*
4. Supabase responds with the user's data (including their `id`) if valid, or a 401 error if not.
5. The middleware extracts the `user_id` and returns it.

Any route that lists `user_id: UUID = Depends(get_current_user)` in its parameters automatically runs this check first. If the token is bad, the request is rejected before the route function even starts.

```python
@router.get("/me")
async def get_my_profile(user_id: UUID = Depends(get_current_user)):
    # user_id is already verified by the time we get here
    return UserService.get_user_profile(user_id)
```

---

### 4. `routes/` — The Menu of Available Actions

Each route file defines a **router** — a group of API endpoints related to one domain. An endpoint is a specific URL + HTTP method combination.

**HTTP methods have semantic meaning:**
| Method | Meaning | Example |
|---|---|---|
| `GET` | Read/fetch data | Get my profile |
| `POST` | Create new data | Create a mentorship request |
| `PUT` | Replace existing data | Update my full mentor profile |
| `PATCH` | Partially update data | Accept/decline a specific request |
| `DELETE` | Remove data | (not used heavily here yet) |

**Example from `routes/requests.py`:**
```python
@router.post("")                              # POST /api/requests
async def create_mentorship_request(
    request_data: MentorshipRequestCreate,    # validated request body
    user_id: UUID = Depends(get_current_user) # must be logged in
):
    return RequestService.create_request(user_id, request_data)
```

This endpoint:
- Accepts POST requests at `/api/requests`
- Requires authentication (the `Depends(get_current_user)`)
- Validates the request body against the `MentorshipRequestCreate` schema
- Delegates all real work to `RequestService.create_request()`

Routes are intentionally thin — their only job is to receive a request, validate it, call the right service, and return the result. No database logic lives here.

**All routes in the app:**

| Route | Endpoints |
|---|---|
| `/api/users` | GET/PUT `/me` |
| `/api/mentors` | GET/POST/PUT `/me`, GET all mentors, GET by ID |
| `/api/mentees` | GET/POST/PUT `/me` |
| `/api/requests` | POST, GET all, GET by ID, PATCH accept, PATCH decline |
| `/api/recommendations` | GET (personalized mentor feed for mentees) |
| `/api/interests` | GET all interests |
| `/api/ai` | POST `/rewrite-request` |

---

### 5. `services/` — Where the Real Work Happens

Service files contain the business logic — all the rules and operations that make the app actually do things. Each service corresponds to a routes file.

#### `services/database.py`

This creates a single shared Supabase client:
```python
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
```
This client is imported by every other service file. It's the connection to the database — all reads and writes go through it.

#### `services/user.py` — UserService

Two operations:
- `get_user_profile(user_id)` — queries the `user_profiles` table by ID
- `update_user_profile(user_id, update_data)` — updates name/role in that table

#### `services/mentor.py` — MentorService

The most complex service. Handles:
- Getting a mentor profile by user_id or by mentor profile ID
- Creating a new mentor profile (including inserting interest relationships into `mentor_interests`)
- Updating a mentor profile (replaces interests by delete-then-insert)
- **`browse_mentors`** — the discovery feed. This:
  1. Fetches all mentor IDs the mentee already has pending/accepted requests or connections with
  2. Queries `mentor_profiles` excluding those IDs
  3. Optionally filters by `help_type` and `industry`
  4. Returns a list of mentor profiles with their interests attached

#### `services/request.py` — RequestService

Handles the core mentorship workflow:
- `create_request` — verifies user is a mentee, checks for duplicate pending requests, inserts into `mentorship_requests`
- `get_requests_for_user` — returns different results depending on role (mentors see incoming requests, mentees see outgoing)
- `accept_request` — updates status to "accepted" and creates a `connections` row
- `decline_request` — updates status to "declined"

#### `services/recommendation.py` — RecommendationService

The personalized feed logic:
1. Confirms the user is a mentee
2. Gets the mentee's interests
3. Gets available mentors via `MentorService.browse_mentors()`
4. Scores each mentor by how many interests they share with the mentee
5. Sorts by score descending and returns the top N

This is a simple but real recommendation algorithm — the mentee sees mentors most like them first.

#### `services/ai.py` — AIService

Currently a **placeholder**. It accepts the original request text and a list of guiding questions, but only capitalizes the first letter and returns a static explanation message. The real implementation would call an AI API (Claude, GPT, etc.) here.

#### `services/discovery_service.py` — DiscoveryService

A more advanced browse service that is written but not yet connected to any route. It adds:
- Hard filtering by the mentee's industry (only see mentors in your field)
- Availability checking (is the mentor's weekly request limit full?)
- Shared interests highlighted in the mentor detail view
- Batch availability checking across all mentors in a single database query (more efficient)

---

### 6. `models/` — Python Representations of Database Tables

Models are Python classes (using Pydantic `BaseModel`) that represent rows in the database. When the app reads data from Supabase, it parses the raw dictionary into a model object so the rest of the code can work with it using typed fields.

**Example — `models/common.py`:**
```python
class HelpType(str, Enum):
    RESUME_REVIEW = "resume_review"
    MOCK_INTERVIEW = "mock_interview"
    CAREER_ADVICE = "career_advice"
    SOCIAL_ADVICE = "social_advice"

class RequestStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
```

Enums enforce that a field can only ever be one of a fixed set of values. If a request comes in with `help_type: "random_thing"`, Pydantic rejects it automatically.

**Example — `models/mentor.py` would look like:**
```python
class MentorProfile(BaseModel):
    id: UUID
    user_id: UUID
    industry: Optional[str]
    job_title: Optional[str]
    help_types_offered: List[HelpType]
    max_requests_per_week: int
    interests: List[Interest]
    is_active: bool
    created_at: datetime
    updated_at: datetime
```

---

### 7. `schemas/` — What Data Looks Like Going In and Out

Schemas are similar to models but serve a different purpose. While models mirror the database, schemas define what the **API** accepts and returns. There are typically three per domain:

| Schema Type | Purpose | Example |
|---|---|---|
| `Create` | Shape of data required to create something | `MentorProfileCreate` — what fields are needed to register as a mentor |
| `Update` | Shape of data allowed when editing | `MentorProfileUpdate` — all fields optional, only update what's provided |
| `Response` | Shape of data returned to the caller | `MentorProfileResponse` — what a frontend receives when it fetches a mentor |

This separation matters because:
- You don't want to expose internal fields (like `is_active` or `created_at`) in the create form
- You don't want to allow the user to set their own `id` or `user_id`
- Update schemas make all fields optional so users can change just one thing

**Example:**
```python
class MentorProfileCreate(BaseModel):
    industry: Optional[str] = None
    job_title: Optional[str] = None
    help_types_offered: List[HelpType]   # required
    max_requests_per_week: int            # required
    interest_ids: List[UUID]             # required
```

---

### 8. `database/seed_interests.sql` — Pre-Filling the Database

This SQL file inserts 60+ pre-defined interests into the `interests` table when the database is set up for the first time. Categories include: sports, technology, arts, hobbies, business, and other.

Users select from these interests (rather than typing freeform text) so the matching algorithm can compare them reliably.

```sql
INSERT INTO interests (name, category) VALUES
  ('software-engineering', 'technology'),
  ('data-science', 'technology'),
  -- ...60+ more
ON CONFLICT (name) DO NOTHING;
```

`ON CONFLICT DO NOTHING` means if the interest already exists (e.g., the seed runs twice), it skips it instead of throwing an error.

---

## How a Real Request Flows Through the System

Here is what happens when a mentee sends a mentorship request, traced through every layer:

```
1. Frontend sends:
   POST /api/requests
   Authorization: Bearer eyJhbGci...
   Body: { "mentor_id": "abc-123", "help_type": "resume_review", "context": "I'm a junior SWE..." }

2. FastAPI receives the request and matches it to:
   routes/requests.py → create_mentorship_request()

3. Before the function runs, Depends(get_current_user) fires:
   middleware/auth.py → asks Supabase "is this token valid?"
   Supabase says yes, returns user_id = "xyz-789"

4. Pydantic validates the body against MentorshipRequestCreate schema:
   ✓ mentor_id is a valid UUID
   ✓ help_type is one of the allowed enum values
   ✓ context is a non-empty string
   → If anything is wrong, FastAPI auto-returns a 422 error with details

5. Route calls: RequestService.create_request(user_id="xyz-789", request_data=...)

6. RequestService:
   a. Queries "mentee_profiles" table — confirms this user is a mentee
   b. Queries "mentorship_requests" table — checks for an existing pending request with this mentor
   c. Inserts a new row into "mentorship_requests" with status="pending"
   d. Reads the inserted row back and builds a MentorshipRequest model object

7. Route returns MentorshipRequestResponse.from_model(request)
   Pydantic serializes it to JSON:
   { "id": "...", "mentee_id": "xyz-789", "mentor_id": "abc-123", "status": "pending", ... }

8. Frontend receives HTTP 201 Created with the JSON body.
```

---

## The Database Schema (What Tables Exist)

Based on what the services query, the Supabase database has these tables:

| Table | What It Stores |
|---|---|
| `user_profiles` | Base user record (id, full_name, role) — one row per user |
| `mentor_profiles` | Mentor-specific info (industry, job_title, help_types_offered, max_requests_per_week, is_active) |
| `mentee_profiles` | Mentee-specific info (goals, career stage, etc.) |
| `interests` | Master list of all available interests (id, name, category) |
| `mentor_interests` | Join table linking mentor profiles to interests (mentor_profile_id, interest_id) |
| `mentee_interests` | Join table linking mentee profiles to interests (mentee_profile_id, interest_id) |
| `mentorship_requests` | All requests between mentees and mentors (mentee_id, mentor_id, help_type, context, key_questions, status, responded_at) |
| `connections` | Accepted pairings (mentor_id, mentee_id, request_id) — created when a request is accepted |

---

## Fundamental Concepts to Learn

These are the building blocks that everything in this backend rests on. Learning them well will let you understand, debug, and scale the app with confidence.

---

### Tier 1 — You Need These Now

**1. HTTP and REST APIs**
Every interaction between frontend and backend is an HTTP request. Learn:
- The five methods: GET, POST, PUT, PATCH, DELETE and when to use each
- HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity, 500 Internal Server Error
- Request anatomy: URL, method, headers, body
- Response anatomy: status code, headers, body
- What "REST" means as an API design style (resources as nouns in URLs, actions as HTTP methods)

> Resources: [MDN HTTP Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP), REST API Tutorial

**2. FastAPI Fundamentals**
- Route decorators (`@router.get`, `@router.post`, etc.)
- Path parameters (`/mentors/{mentor_id}`)
- Query parameters (`?limit=20&offset=0`)
- Request bodies (JSON automatically parsed by Pydantic)
- `Depends()` — dependency injection, how `get_current_user` hooks into every route
- `response_model` — how FastAPI serializes return values
- Automatic docs at `/docs` (Swagger UI) — use this constantly to test your API

> Resource: [FastAPI official tutorial](https://fastapi.tiangolo.com/tutorial/)

**3. Pydantic Data Validation**
- `BaseModel` — defining typed data classes
- Field types: `str`, `int`, `bool`, `UUID`, `datetime`, `Optional[X]`, `List[X]`
- How Pydantic auto-validates incoming data and rejects bad shapes
- `Optional` vs required fields
- `model_validator` and `field_validator` for custom rules

> Resource: [Pydantic docs](https://docs.pydantic.dev/)

**4. SQL and Relational Databases**
Everything stored in Supabase is a relational database (PostgreSQL under the hood). Learn:
- Tables, rows, columns, and data types
- Primary keys and foreign keys
- `SELECT`, `INSERT`, `UPDATE`, `DELETE`
- `WHERE`, `ORDER BY`, `LIMIT`, `OFFSET`
- **JOIN** — how to combine data from two tables in one query (e.g., get a mentor with all their interests in one go)
- What an index is and why it makes queries faster
- Unique constraints and why `ON CONFLICT DO NOTHING` is useful

> Resource: SQLBolt (interactive), PostgreSQL official tutorial

**5. Python Basics for Backend Work**
- Classes and methods (every service is a class with `@staticmethod` methods)
- Exception handling (`try/except/raise`)
- `Enum` — defining fixed sets of allowed values
- `UUID` — universally unique identifiers and why they're used as IDs instead of sequential integers
- `datetime` — timestamps, timezone-aware vs naive datetimes
- f-strings and string formatting
- `Optional` and type hints

---

### Tier 2 — Learn These to Properly Scale It

**6. Authentication and JWTs (JSON Web Tokens)**
- What a JWT is: a signed, base64-encoded token that contains user claims
- The three parts: header, payload, signature
- Why the backend can verify a JWT without hitting the database (the signature)
- `access_token` vs `refresh_token` — access tokens expire (short-lived), refresh tokens get new access tokens
- Supabase Auth specifically: how it issues tokens, how the service role key differs from the anon key
- OAuth flows (for LinkedIn Sign In): authorization code flow, what happens at each step

> Resource: jwt.io (visualizer), Supabase Auth docs

**7. Environment Variables and Secrets Management**
- What a `.env` file is and why it's in `.gitignore`
- `python-dotenv` — loading `.env` files in Python
- The difference between development, staging, and production environments
- Why `service_role_key` must never be in the frontend (it bypasses all row-level security)
- How to manage secrets on a deployed server (environment variables, secret managers)

**8. Database Relationships and N+1 Queries**
This is the biggest performance trap in this codebase right now.
- **One-to-one** (one user has one mentor profile)
- **One-to-many** (one mentor has many requests)
- **Many-to-many** (mentors and interests — connected through a join table)
- What an N+1 query is: fetching a list of N items and then making one additional query per item = N+1 total queries
- How to fix N+1 with JOINs or batch queries
- Supabase's embedded relationship syntax: `select('*, mentor_interests(interest:interests(*))')`

**9. Error Handling and Logging**
- `HTTPException` — returning meaningful error responses with correct status codes
- Why you should not expose raw exception messages to users (security + UX)
- Structured logging with Python's `logging` module
- Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- What to log and what not to log (never log passwords or tokens)
- Using Sentry or a similar service for production error tracking

**10. API Design Principles**
- Idempotency — a `PUT` request with the same data twice should produce the same result
- Pagination — never return unbounded lists; always use `limit`/`offset` or cursor-based pagination
- Versioning — `/api/v1/...` so you can change the API without breaking existing clients
- Consistent error response shapes — all errors should return `{ "detail": "..." }`
- Documentation — FastAPI does this automatically, but learn to write good docstrings

**11. Async Python**
FastAPI is built on `asyncio`. The current code mixes sync and async inconsistently (`DiscoveryService` uses `async def`, while `RequestService` uses regular `def`).
- `async def` vs `def` in Python
- `await` — what it means and when you need it
- Why async matters for a web server: one async worker can handle many requests at once while waiting for database responses
- When to use sync vs async with the Supabase client

**12. CORS and Web Security Basics**
- What CORS is, why browsers enforce it, and how `CORSMiddleware` bypasses it
- Why `allow_origins=["*"]` is dangerous in production
- HTTPS — why all production traffic must be encrypted
- Common attack vectors to be aware of: SQL injection (Supabase's client protects against this), XSS, CSRF
- Row Level Security (RLS) in Supabase — database-level rules that enforce access control even if your application code has a bug

---

### Tier 3 — For Scaling Beyond MVP

**13. Caching**
- What a cache is: a temporary, fast storage layer that avoids slow repeated computations or queries
- Redis — the most common in-memory cache for web backends
- Cache invalidation — the hard part: knowing when cached data is stale
- What to cache in this app: the interests list (never changes), mentor profiles (change infrequently), recommendation results (expensive to compute)

**14. Background Jobs and Queues**
- Some tasks shouldn't run inside an HTTP request because they're too slow (sending emails, calling AI APIs)
- Task queues: Celery + Redis, or Supabase Edge Functions
- Use case in this app: sending a notification email when a mentor accepts a request

**15. Real-Time Features**
- WebSockets — a persistent connection between browser and server that allows the server to push updates
- Supabase Realtime — a built-in feature that streams database changes to subscribed clients
- Use case in this app: live message delivery in the Messages screen without polling

**16. Testing**
- Unit tests — testing a single function in isolation
- Integration tests — testing a route end-to-end (request in, response out)
- `pytest` — Python's testing framework
- FastAPI's `TestClient` — makes HTTP requests to your app in tests without running a real server
- Mocking — replacing real dependencies (like database calls) with fake ones in tests

**17. Deployment**
- What a production server actually looks like: a Linux machine running `uvicorn` behind a reverse proxy (Nginx)
- Docker — packaging the app into a container so it runs identically everywhere
- Hosting options: Railway, Render, Fly.io, AWS, GCP (Supabase can also host Edge Functions)
- Environment variables in production vs `.env` files in development
- CI/CD pipelines — automatically running tests and deploying on every git push

---

## Quick Reference: Which File to Edit for Common Tasks

| Task | File(s) to Edit |
|---|---|
| Add a new API endpoint | `routes/<domain>.py` + `services/<domain>.py` |
| Change what data an endpoint accepts | `schemas/<domain>.py` (the `Create` or `Update` class) |
| Change what data an endpoint returns | `schemas/<domain>.py` (the `Response` class) |
| Change database query logic | `services/<domain>.py` |
| Add a new database table | Supabase dashboard + new model in `models/` |
| Change auth behavior | `middleware/auth.py` |
| Add a new environment variable | `.env` + `config.py` |
| Change which routes are available | `main.py` (add `app.include_router(...)`) |
| Implement the AI feature | `services/ai.py` |
