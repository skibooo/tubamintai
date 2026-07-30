# YOUTUBAMINTAI Architecture Document

## 1. Product Vision
YOUTUBAMINTAI is a fully integrated AI YouTube production team that helps creators build, automate, and grow YouTube channels. Its primary focus is increasing YouTube recommendation, popularity, and channel growth by optimizing for CTR, watch time, and retention.

The platform provides a strict Multi-Tenant environment distinguishing between unlimited lifetime "OWNER" access and subscription-restricted "PUBLIC" access, supporting 30, 60, 90, and 365-day fully automated creation cycles.

## 2. System Architecture

### Frontend (Client-Side)
- **Framework:** React 18+ with Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Routing:** React Router
- **Key Modules:**
  - `LandingPage`, `Auth`, `Dashboard`
  - `Creator Studio` (AI Assisted Mode)
  - `AI Autopilot & Automation Cycles` (30/60/90/365-day planners)
  - `Chatbot Assistant` (Context-aware AI Manager)
  - `Video Review & Approval`
  - `Role Management & Subscriptions` (OWNER vs PUBLIC)

### Backend (Server-Side)
- **Framework:** Node.js with Express/Fastify
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL (Cloud SQL/Supabase)
- **Key Modules:**
  - `/auth`: User, Roles (OWNER/PUBLIC), and Google/YouTube OAuth (Upload/Manage/Analytics scopes)
  - `/channels`: YouTube channel connection and data isolation (Multi-tenant)
  - `/ai`: AI routing (Niche, Script, Media, Analytics agents). Includes strict UNIQUENESS checks against the global content database to ensure no two users get identical content.
  - `/media`: Video factory (Voice, Images, Captions, Video editing integrations like CapCut/Canva/Runway API proxies, FFmpeg rendering)
  - `/youtube`: YouTube API integrations (Upload, Schedule, Analytics, Metadata optimization)
  - `/automation`: Cron jobs and background tasks for 30/60/90/365-day Autopilot cycles with Auto-Refresh capabilities.

### Multi-Tenancy & Content Uniqueness
- Every user is an isolated tenant.
- **Uniqueness Engine:** Before finalizing a generated topic, title, script, or metadata, the backend creates a `content_hash` and checks the `videos` table. If a high similarity or exact match exists, the AI is automatically prompted to rewrite and regenerate unique angles. No two users will ever receive identical content, even in the same niche.

### Role & Access Logic
- **OWNER:** Lifetime unlimited access. Unlimited channels, unlimited 365-day cycles, no renewals required. Bypasses all subscription checks.
- **PUBLIC USER:** Bound by subscription tiers (Tier 1: 30-day, Tier 2: 60-day, Tier 3: 90-day, Tier 4: 365-day). Automation strictly halts when the cycle expires unless renewed.

### AI System Architecture (Recommendation Focus)
The AI layer is structured as a multi-agent system heavily optimized for YouTube's recommendation algorithm:
- **Router Agent:** Interprets user intent (via chat or UI) and delegates tasks.
- **Niche & Strategy Agent:** Research, blueprint creation, competitive analysis.
- **Script & Content Agent:** Writing high-retention scripts (Hook, Body, CTA) and SEO metadata (Titles, Tags, Chapters) optimized for CTR.
- **Media Production Agent:** Prompting image models (Microsoft Designer/Bing Image Creator styling), generating TTS voiceovers, assembling assets with fast-paced editing instructions for high watch time.
- **Analytics Agent:** Pulling YouTube stats (CTR, Retention) and generating feedback loops to continuously improve future content generation.
