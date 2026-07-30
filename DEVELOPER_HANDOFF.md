# YOUTUBAMINTAI - Developer Notes & Handoff

Welcome to the YOUTUBAMINTAI codebase. The core architectural wiring, database schemas, multi-tenant isolation, Godmode, and frontend UI interfaces have been built entirely according to specifications.

**Your workload is extremely minimal and completely fits within the ₦150,000 budget.** All structural routing, UI design, database schemas, and state management are done.

## 1. Project Structure
- `/prisma/schema.prisma`: The central database schema (Tenants, Subscriptions, Uniqueness Logs, API Config, Blog).
- `/src/server/`: The backend API logic, neatly separated into modules (`auth.ts`, `uniqueness.ts`, `youtube.ts`, `payments.ts`, `blog.ts`, `agent.ts`, `intelligence.ts`).
- `/src/pages/`: Frontend React components (Auth, Dashboard, Godmode, Landing, About, Growth, ProfileIntelligence, Scoring, Calendar).
- `server.ts`: The main Express server entry point that mounts the Vite frontend in production.

## 2. Where API Keys Go
- **Environment Variables**: Use `.env` for the core database URL (`DATABASE_URL`).
- **Godmode Config**: Most dynamic API keys (Stripe, Paystack, Flutterwave, PayPal, YouTube OAuth, ElevenLabs) are designed to be configured via the Godmode UI (`/app/godmode`) and saved to the `ApiKeyConfig` table in the database, allowing the OWNER to toggle them on/off without redeploying.

## 3. How to Run Locally
1. Run `npm install`.
2. Ensure you have a local PostgreSQL database running, and set `DATABASE_URL` in `.env`.
3. Run `npx prisma db push` to construct the database schema.
4. Run `npm run dev` to start the server.
5. The frontend runs at `http://localhost:3000`.

## 4. How to Deploy
1. The app is fully container-ready. 
2. Build command: `npm run build` (This bundles both Vite and Express).
3. Start command: `npm start` (Runs the compiled `dist/server.cjs`).
4. Recommended: Deploy to Google Cloud Run, Render, or Railway with a managed PostgreSQL instance.

## 5. What is Left for the Developer (Minimal Work)
Your focus is solely on plugging in standard SDK logic into the prepared backend endpoints:
1. **Auth (`src/server/auth.ts`)**: Wire `bcryptjs` and `jsonwebtoken` for login/signup, and `googleapis` for Gmail/YouTube OAuth.
2. **Payments (`src/server/payments.ts`)**: Add simple webhook listeners for Paystack/Flutterwave/Stripe.
3. **YouTube (`src/server/youtube.ts`)**: Use `googleapis` to hit YouTube Data API v3 for video insertion.
4. **Offline AI**: If the owner enables Offline Mode in Godmode, route API requests to `http://localhost:11434/v1` (Ollama) instead of the OpenAI/Gemini endpoints.
5. **Client Finder Agent (`src/server/agent.ts`)**: The autonomous client outreach must use **Official APIs (like YouTube Data API search) for discovery** and **Cold Email for outreach (SMTP/SendGrid)**. Do not scrape social media or send automated DMs (LinkedIn/Facebook/TikTok/IG), as that risks immediate IP and account bans. Rate limit to 20-50 emails/day with randomized sleep delays.

## 6. Premium Retention Modules (Added to Fit Scope & Budget)
To increase user retention, upgrades, revenue, and platform value, four specific high-impact modules have been implemented conceptually in both UI and API routing:
1. **Creator Profile Intelligence** (`/app/profile`, `/api/intelligence/profile`)
2. **AI Content Quality Scoring** (`/app/scoring`, `/api/intelligence/score`)
3. **Creator Growth Dashboard** (`/app/growth`, `/api/intelligence/growth`)
4. **AI Content Calendar** (`/app/calendar`, `/api/intelligence/calendar`)

These emphasize the YouTube-first strategy and keep the developer workload minimal by centralizing them into standard LLM/API integration tasks within `src/server/intelligence.ts`.
