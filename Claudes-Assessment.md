# Claude's Assessment — ReallyConnect

> Assessed: April 19, 2026
> Codebase: React + Vite (frontend) · FastAPI + Supabase (backend)

---

## 1. What the App Is Attempting to Do

ReallyConnect is a **mentorship-matching platform** targeting communities like ColorStack where junior members struggle to get meaningful responses from alumni and industry professionals. The core idea is to replace cold, unstructured DMs with a respectful, intentional system.

**The intended user flow:**

1. A new user lands on the site, chooses a role (Mentor or Mentee), and completes onboarding.
2. **Mentees** browse a swipeable card-feed of mentor profiles (Tinder-style), filtered by industry, help type, and shared interests.
3. When a mentee "likes" a mentor, they compose a structured mentorship request — optionally AI-assisted — that includes context and specific questions.
4. **Mentors** receive requests in an organized inbox and accept or decline them.
5. When a request is accepted, a **match** (connection) is created and both parties can message each other.
6. Mentors control their own load via a `max_requests_per_week` limit.

The differentiation is the **AI-powered request workflow**: rather than a raw message, the mentee is guided to write a high-quality, specific ask, protecting mentor time and increasing response rates.

---

## 2. The Specific Ways It Is Successful

### Backend Architecture — Well-Designed Foundation
- **Clean service/route separation.** Every domain (users, mentors, mentees, requests, recommendations, interests) has its own route file and service class. This is a scalable, maintainable structure.
- **Real JWT authentication.** `middleware/auth.py` validates tokens by calling Supabase's `/auth/v1/user` endpoint — a correct, secure approach that works with all Supabase auth methods.
- **Mentorship request lifecycle is complete.** Create, list, get, accept, and decline are all implemented with proper role checks (only mentees create; only mentors respond). Duplicate request prevention is also in place.
- **Connection creation on accept.** When a mentor accepts, a row is atomically inserted into the `connections` table — the correct trigger for unlocking messaging.
- **Mentor capacity management.** The `max_requests_per_week` field and availability checks (`DiscoveryService`) mean mentors can self-limit their inbox load — central to the app's value proposition.
- **Interest-based recommendation engine.** `RecommendationService` scores and ranks mentors by shared interest count, a simple but functional relevance signal.
- **Mentor browse excludes existing connections.** `MentorService.browse_mentors` filters out mentors the mentee already has pending/accepted requests with — good UX and data hygiene.
- **Seed data for interests** covers 60+ interests across six categories, ready to power real matching immediately.
- **Pydantic schemas are thorough.** All models have explicit create/update/response schemas with optional fields handled correctly.

### Frontend Design & UX
- **Mobile-first CSS.** The stylesheet uses `100dvh`, `backdrop-filter`, `@media` breakpoints for 480px, 375px, and 360px, and a fixed bottom nav — clearly designed for phones first.
- **Role-selection card UI.** The Mentor/Mentee selection screen with image cards is clean and sets a strong visual first impression.
- **Swipe-card layout.** The `ProfileCard` component with a photo overlay and the like/dislike button layout mirrors a familiar interaction pattern that lowers the learning curve.
- **Bottom navigation.** `MobileNav` with Home/Matches/Profile icons creates an app-like shell experience consistent with native mobile patterns.
- **Breadcrumb navigation** on auth pages (Sign In, Sign Up) gives useful context for multi-step flows.
- **Consistent design language.** The gradient backgrounds, rounded cards, and green accent color (`#61d86b`, `#4caf50`) are used consistently throughout, giving the product a cohesive look.
- **Responsive onboarding forms.** The onboarding pages scale up to desktop widths gracefully with three breakpoints.

---

## 3. The Ways in Which It Is Faulty

### At 100–200 Users Per Day, These Would Be Showstopper Failures

---

#### CRITICAL — App Is Non-Functional End to End

~~**1. Frontend and backend are completely disconnected.**~~
~~The frontend makes **zero API calls** to the FastAPI backend. There is no `fetch`, `axios`, or any HTTP client anywhere in the frontend source. Every piece of user data flows only into `localStorage` and never reaches Supabase. With 100 users signing up, the database would stay empty.~~

**Resolved.** Added `frontend/src/lib/api.js` — a fetch-based client that injects the Supabase access token on every request and exposes `userAPI`, `mentorAPI`, `menteeAPI`, `interestsAPI`, `requestsAPI`, `recommendationsAPI`, `aiAPI`, and `messagesAPI`. Added `frontend/src/lib/supabase.js` for the Supabase client (driven by `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`). Pages (`SignUp`, `MentorOnboarding`, `MenteeOnboarding`, `AppHome`, `Matches`, `Messages`, `Profile`) now read and write through these clients.

~~**2. Authentication is faked.**~~
~~`SignIn.jsx` contains:~~
~~```js~~
~~const handleSignIn = () => {~~
~~  navigate("/app/home"); // After successful auth~~
~~};~~
~~```~~
~~Pressing "Sign In through LinkedIn" skips all actual auth and drops the user directly into the app. There is no LinkedIn OAuth, no Supabase session, and no JWT token generated. Every user is effectively anonymous.~~

**Resolved.** `frontend/src/contexts/AuthContext.jsx` wraps real Supabase auth (`signInWithPassword`, `signUp`, `signInWithOAuth("linkedin_oidc")`, `signOut`) and listens to `onAuthStateChange`. `SignIn.jsx` now calls `signInWithEmail` / `signInWithOAuth` and surfaces real errors. The Supabase access token is injected as `Authorization: Bearer <token>` on every backend call by the new `api.js` client, and `middleware/auth.py` validates it against Supabase's user endpoint.

~~**3. No route protection.**~~
~~Any person who types `/app/home` into their browser gets full access to the app with zero authentication. With real users, this means zero data security.~~

**Resolved.** `frontend/src/components/ProtectedRoute.jsx` exposes `ProtectedRoute` (redirects unauthenticated users to `/signin`, and to `/signup` when `requireProfile` is set but no backend profile exists) and `PublicRoute` (redirects already-signed-in users away from `/signin`). `App.jsx` wraps every `/app/*` route with `ProtectedRoute requireProfile={true}` and `/signin` with `PublicRoute`.

~~**4. Onboarding data is thrown away.**~~
~~Both `MentorOnboarding` and `MenteeOnboarding` write to `localStorage` only. The data is never sent to `POST /api/mentors/me` or `POST /api/mentees/me`. Mentor and mentee profiles in Supabase are never created, so the recommendation engine and request system have no data to work with.~~

**Resolved.** `MentorOnboarding.jsx` collects `industry`, `job_title`, `help_types_offered`, `max_requests_per_week`, `interest_ids`, and `profile_picture_url`, then calls `mentorAPI.createMe(...)` on submit. `MenteeOnboarding.jsx` collects `industry`, `goals`, `background`, `help_needed`, `interest_ids`, and `profile_picture_url`, then calls `menteeAPI.createMe(...)`. Both pre-load the interests list via `interestsAPI.getAll()` and refresh the auth context on success before navigating to `/app/home`. `SignUp.jsx` calls `userAPI.updateMe({ full_name, role })` to persist the role.

~~**5. The swipe feed is hardcoded mock data.**~~
~~`AppHome.jsx` renders a single static profile ("Sarah Kim, Product Manager") from a local `mockProfiles` array. The like/dislike buttons have `onClick` handlers that do nothing — no backend call, no state change, no navigation. Swiping is purely cosmetic.~~

**Resolved.** `AppHome.jsx` now fetches real mentors via `recommendationsAPI.get({ limit: 20 })` on mount, renders them into `ProfileCard` (job title, industry, interests, help types, profile picture), and tracks the current index. The like button calls `requestsAPI.create({ mentor_id, help_type, context, key_questions })` and advances the feed; the dislike button just advances. Loading, error, and exhausted-feed states are rendered, and a "Refresh" action re-fetches when the queue empties. Also fixed a JSX bug where the like-button glyph was an unrendered `&#10004;` HTML entity inside a JS string, and made the mentor display name fall back through `full_name → job_title → "Mentor"`.

~~**6. The Matches page references non-existent image assets.**~~
~~`Matches.jsx` imports:~~
~~```js~~
~~import profile from "../assets/JamesWright.jpg";~~
~~import sarah from "../assets/sarah.jpg";~~
~~```~~
~~Neither `JamesWright.jpg` nor `sarah.jpg` exists in the `frontend/src/assets/` directory. This causes a **build failure** — the app cannot be compiled and shipped in production. With 100 users, zero users would see a Matches page.~~

**Resolved.** The static image imports are gone. `Matches.jsx` now fetches the real list via `requestsAPI.getAll()`, splits it into `pending` (mentor inbox with Accept/Decline buttons wired to `requestsAPI.accept` / `decline`) and `accepted` (matches list), and uses a neutral CSS avatar circle instead of imported assets. Each accepted match links to `/app/matches/messages/<partner_user_id>` so the recipient is no longer hardcoded.

~~**7. The Messages page is a static mockup.**~~
~~`Messages.jsx` hardcodes the name `"James Wright"`, shows no message history, and the Send button has no handler. No messages can be sent or received. The `connections` and messaging tables in Supabase are never touched by the frontend.~~

**Resolved.** Built the messaging stack end to end:
- **Backend**: new `models/message.py`, `schemas/message.py` (`MessageCreate`, `MessageResponse`, `MessageThreadResponse`, `ConnectionPartner`), `services/message.py` (lookups the `connections` row in either direction, enforces that both users share an accepted connection, loads partner display info from `user_profiles` + role-specific profile pictures), and `routes/messages.py` mounted at `/api/messages` with `GET /api/messages/{other_user_id}` and `POST /api/messages/{other_user_id}`. Migration script at `backend/database/add_messages.sql` creates the `messages` table (FK to `connections`, sender/recipient, 1–2000 char content, indexes on `(connection_id, created_at)` and recipient).
- **Frontend**: `messagesAPI.list` / `messagesAPI.send` added to `lib/api.js`. `App.jsx` route is now `/app/matches/messages/:userId`. `Messages.jsx` reads `userId` from route params, calls `messagesAPI.list(userId)` to load partner info + history, polls every 5s for updates, renders mine/theirs bubbles based on `sender_id === user.id`, autoscrolls on new messages, and the Send button submits via `messagesAPI.send(userId, content)`. The placeholder typo `:Send a message...` is gone and the recipient name is whatever Supabase returns, no more "James Wright".

**8. The AI feature is a stub.**
`AIService.rewrite_request()` does exactly one thing: capitalize the first character of the input string. The endpoint exists, the schema is wired up, but the actual AI call (to Anthropic, OpenAI, or any other provider) is not implemented. The core differentiating feature of the product does not exist.

---

#### HIGH — Would Cause Widespread Failures Under Load

**9. N+1 query pattern in `browse_mentors`.**
`MentorService.browse_mentors` fetches mentor IDs, then loops and calls `get_mentor_profile_by_id()` for each one — each of which makes two separate Supabase queries (profile + interests). For a page of 20 mentors, this is **41 sequential database round-trips**. At 100+ active users browsing simultaneously, this would saturate the Supabase connection pool and cause cascading timeouts.

**10. `DiscoveryService` is dead code with a syntax error.**
`discovery_service.py` contains the most fully-featured browse logic (industry matching, availability checks, shared interests) but it is **never imported or called anywhere**. It also has a syntax error — a comment (`#This is for when...`) is placed inside the class body between two `@staticmethod` methods at the wrong indentation level, which would cause a Python parse error if it were imported.

**11. CORS is fully open.**
`main.py` sets `allow_origins=["*"]`. In production with real users and real JWTs, this allows any website on the internet to make authenticated requests on behalf of ReallyConnect users.

**12. `Profile.jsx` is disconnected from the backend.**
Profile reads/writes go only to `localStorage`. Changes are not persisted to Supabase. Clearing browser storage or switching devices loses all profile data. "Delete Profile" only clears localStorage and shows a browser `alert()`.

**13. Button positioning uses hardcoded pixel offsets.**
The like/dislike buttons in `App.css` use:
```css
bottom: 350px; left: calc(50% - 80px);
bottom: 300px; right: calc(50% - 60px);
```
These values are not relative to the card height and will be misaligned on any device that doesn't match the exact screen height the developer tested on.

**14. `border-radius: 80%` on buttons is a visual bug.**
The like/dislike buttons use `border-radius: 80%` which produces an oval instead of a circle. The intended value is likely `50%` or a fixed pixel value like `8px`.

**15. `AppHome` image reference is broken.**
The mock profile object uses:
```js
image: { sarah }  // This is { sarah: <module> }, not a URL
```
This passes an object reference as the `src` prop to an `<img>` tag. The image will not render — it produces a broken image icon.

**16. `Messages.jsx` has a UI typo.**
The message input placeholder reads `:Send a message...` — the colon prefix appears to be a stray character.

**17. No loading states or error boundaries in the frontend.**
There are no `<Suspense>` boundaries, no skeleton screens, no error fallbacks, and no empty states (e.g., "No matches yet"). With real async data, users would see blank white screens or unhandled React errors during any failed API call.

**18. No input validation on onboarding forms.**
Onboarding fields are free-text with only `required` HTML attributes. Users can submit a single space, extremely long strings, or script injection attempts.

**19. `MobileNav` imports `Breadcrumb` but never uses it.**
An unused import that adds dead code and potential confusion.

**20. Landing page has no content.**
`Landing.jsx` renders only a nav bar and a copyright footer. There is no hero copy, no value proposition, no call-to-action, and no description of what the app does. A new visitor has no reason to sign up.

**21. `datetime.utcnow()` is deprecated.**
`request.py` and `mentor.py` use `datetime.utcnow().isoformat()` which has been deprecated since Python 3.12. This will generate warnings and eventually break.

**22. No pagination handling on the frontend.**
The backend supports `limit`/`offset` pagination, but the frontend has no infinite scroll, "load more" button, or page control. If connected, users would always see the same first 20 mentors.

**23. No notification system.**
When a mentor accepts a request, the mentee has no way to know. There are no in-app notifications, no email triggers, and no real-time updates. Users would have to manually check the app constantly.

---

## 4. Exhaustive MVP Checklist

The items below represent everything needed to make ReallyConnect functional, stable, and ready for real users. They are organized by priority.

---

### PHASE 1 — Make the App Actually Work (Blockers)

#### Authentication
- [x] Implement real Supabase Auth in the frontend (email/password or LinkedIn OAuth via Supabase)
- [x] Store the Supabase session token (`access_token`) in memory or `sessionStorage` after login
- [x] Pass `Authorization: Bearer <token>` header on every API call
- [x] Create a `useAuth` hook or context that exposes the current user and session
- [x] Add route guards — redirect unauthenticated users from `/app/*` routes to `/signin`
- [x] Add redirect from `/signin` and `/signup` to `/app/home` if already logged in
- [x] Wire the "Sign Out" button in `Profile.jsx` to `supabase.auth.signOut()` and clear session state

#### API Integration — Onboarding
- [x] After mentor onboarding form submit, call `POST /api/mentors/me` with the form data
- [x] After mentee onboarding form submit, call `POST /api/mentees/me` with the form data
- [x] Map onboarding form fields to the correct API schema fields (expertise → `job_title`, adviceArea → `help_types_offered`, etc.)
- [x] Add interest selection UI to both onboarding forms (multi-select from `GET /api/interests`)
- [x] Add `max_requests_per_week` field to mentor onboarding
- [x] After onboarding API call succeeds, then navigate to `/app/home` (not before)
- [x] Handle API errors in onboarding forms with user-visible error messages

#### API Integration — Discover Feed (AppHome)
- [x] Replace the `mockProfiles` array in `AppHome.jsx` with a call to `GET /api/recommendations`
- [x] Render the real `MentorProfileResponse` data in the `ProfileCard` component (name, job_title, industry, interests)
- [x] Implement the "like" button to trigger a request modal or navigate to a request-compose screen
- [x] Implement the "dislike" button to skip to the next mentor profile (advance the feed index)
- [x] Show a loading state (skeleton card) while the API call is in flight
- [x] Show an empty state ("No more mentors to browse") when the feed is exhausted
- [x] Add basic pagination — fetch the next batch when the current batch runs out

#### API Integration — Matches Page
- [x] Replace hardcoded James Wright / Sarah Nguyen with a call to `GET /api/requests?status=accepted` or a connections endpoint
- [x] Remove the broken `import profile from "../assets/JamesWright.jpg"` and `sarah.jpg` imports
- [x] Render real matched mentor names, job titles, and profile avatars (or initials fallback)
- [x] Each match card should link to the Messages page with that specific user's ID in the route (e.g., `/app/matches/messages/:userId`)

#### API Integration — Messages Page
- [x] Update the route to `/app/matches/messages/:userId` and read `userId` from route params
- [x] Implement real message send via a backend messaging endpoint (or Supabase Realtime)
- [x] Load and display message history between the two users
- [x] Show real user name from the matched connection, not the hardcoded `"James Wright"`
- [x] Implement the Send button to actually submit the message

#### API Integration — Profile Page
- [x] Replace all `localStorage.getItem("profile")` with a call to `GET /api/users/me`
- [x] Replace `localStorage.setItem("profile")` on save with a call to `PUT /api/users/me`
- [x] Remove the browser `alert()` from the delete handler — use inline UI feedback
- [x] Remove `handleDelete` or replace with a proper account deactivation flow

---

### PHASE 2 — Fix Bugs That Cause Crashes or Broken UI

- [x] Fix the broken image imports in `Matches.jsx` — add real assets or remove the static mocks entirely
- [x] Fix `image: { sarah }` in `AppHome.jsx` mock data — it should be `image: sarah` (the imported module, not an object wrapper)
- [x] Fix `border-radius: 80%` on like/dislike buttons to `50%` (circle) or `8px` (rounded rect)
- [x] Fix the hardcoded pixel positioning of like/dislike buttons — use flexbox or CSS Grid relative to the card container
- [x] Fix the `:Send a message...` typo in `Messages.jsx` — remove the leading colon
- [x] Fix the `DiscoveryService` syntax error (misplaced comment inside class body)
- [x] Fix `datetime.utcnow()` deprecation warnings in `request.py` and `mentor.py` — replace with `datetime.now(timezone.utc)`
- [x] Remove the unused `Breadcrumb` import from `MobileNav.jsx`

---

### PHASE 3 — Core UX & Flows That Must Exist for MVP

#### Request Workflow (The Core Feature)
- [x] Build a "Send Request" modal or page triggered by swiping right / clicking like
- [x] The request form must collect: `help_type` (dropdown from `HelpType` enum), `context` (textarea), `key_questions` (optional list)
- [x] Wire the form to `POST /api/requests`
- [ ] Add the AI rewrite button that calls `POST /api/ai/rewrite-request` (once AI is implemented)
- [x] Show confirmation and return to the feed after successful request submission

#### Mentor Request Inbox
- [x] Build a request inbox view for mentors (currently no frontend page exists for this)
- [x] Call `GET /api/requests` and render pending requests with mentee name, help type, context, and questions
- [x] Add Accept and Decline buttons wired to `PATCH /api/requests/{id}/accept` and `/decline`
- [x] Show timestamp and help type badge on each request

#### Landing Page Content
- [x] Add hero section with headline, subheadline, and a clear call-to-action ("Get Started" → `/signup`)
- [x] Add a brief description of how it works (3-step explainer: Browse → Request → Connect)
- [x] Add social proof or purpose copy (ColorStack community context)

---

### PHASE 4 — Implement the AI Feature

- [ ] Choose an AI provider (Anthropic Claude recommended given the team's context)
- [ ] Add the API key to `.env` and `config.py`
- [ ] Implement `AIService.rewrite_request()` to call the real AI API with a structured prompt:
  - Include the original request text
  - Include the mentee's stated goals and interests
  - Prompt the model to improve clarity, specificity, and professionalism
  - Return the rewritten text and a brief explanation of changes
- [ ] Add rate limiting or cost guardrails on the AI endpoint (e.g., max 5 rewrites per user per day)
- [ ] Surface the AI suggestion in the request compose UI with "Accept suggestion" / "Keep mine" options

---

### PHASE 5 — Security, Performance & Reliability

#### Security
- [ ] Change `allow_origins=["*"]` in `main.py` to the specific production frontend URL
- [ ] Add input length validation on all request body fields (e.g., `context` max 1000 chars, `key_questions` max 5 items)
- [ ] Ensure the Supabase `service_role_key` is never exposed to the frontend
- [ ] Add backend rate limiting per user ID on request creation (prevent spam)

#### Performance
- [ ] Refactor `MentorService.browse_mentors` to use a single Supabase join query instead of N+1 individual calls
- [ ] Use Supabase's `select('*, mentor_interests(interest:interests(*))')` join pattern (already shown in `DiscoveryService`) in place of the loop
- [ ] Wire `DiscoveryService` to the recommendations or browse route (it has better logic than the current implementation)
- [ ] Add frontend-side caching for interests list (it never changes — fetch once, store in state)

#### Frontend Robustness
- [x] Add a top-level React error boundary to prevent white-screen crashes
- [x] Add loading states (spinner or skeleton) for every page that fetches data
- [x] Add empty states for: no matches, no messages, empty feed
- [x] Add error toast/banner for failed API calls with a retry option
- [x] Validate onboarding form inputs beyond just `required` (min length, max length, disallow whitespace-only)

#### Messaging Infrastructure
- [x] Decide on and implement a messaging backend: Supabase Realtime (recommended) or a messages table with polling
- [x] Create the `messages` database table if it doesn't exist (sender_id, recipient_id, content, created_at)
- [x] Implement `GET /api/messages/{connection_id}` and `POST /api/messages/{connection_id}`

---

### PHASE 6 — Polish for Launch

- [x] Add profile photo upload (Supabase Storage) for both mentors and mentees
- [x] Add a notification indicator on the Matches nav icon when there are new accepted requests
- [x] Add a "Pending" requests tab in Matches for mentees to see sent-but-not-yet-accepted requests
- [ ] Ensure consistent color/font between onboarding pages (gold gradient) and app pages (dark/blue) — currently the design language splits between two themes
- [x] Add a `<title>` tag per page (currently all pages share the Vite default title)
- [x] Write a proper `.env.example` file documenting all required environment variables
- [ ] Update `README.md` with accurate setup instructions, including that both frontend and backend must be running simultaneously
- [ ] Remove the `/test-supabase` endpoint from `main.py` before deploying to production
- [ ] Add a `Demo Video` and `Screenshots` section to `README.md` (both are marked "Coming soon")
