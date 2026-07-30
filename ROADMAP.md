# YOUTUBAMINTAI Development Roadmap

## Phase 1: Foundation & Multi-Tenancy (VS Code Transition)
- [ ] Initialize Git Repository & Monorepo (Frontend: React/Vite, Backend: Express/Node)
- [ ] Configure PostgreSQL Database & Prisma ORM with Multi-Tenant Isolation
- [ ] Implement User Authentication (Email & Google OAuth)
- [ ] Setup Role-Based Access Control (RBAC): OWNER (Unlimited) vs PUBLIC (Subscription-based)
- [ ] Setup YouTube Data API v3 Integration (Upload, Manage Videos, Read Analytics scopes)

## Phase 2: AI Engines & Uniqueness Check (Intelligence Layer)
- [ ] Integrate LLM APIs (Gemini/OpenAI) for Text Generation
- [ ] Build Uniqueness Engine: Hashing and similarity checks to guarantee 100% unique content per tenant
- [ ] Build Niche Discovery & Channel Blueprint Engine
- [ ] Build Script & Storyboard Generators optimized for high viewer retention
- [ ] Implement AI Chatbot Assistant with system prompts & tool-calling

## Phase 3: Video Factory (Media Pipeline)
- [ ] Integrate TTS API (e.g., ElevenLabs or Google TTS)
- [ ] Integrate Image Generation API (Microsoft Designer/Bing Image Creator prompt compatibility, Midjourney API, DALL-E)
- [ ] Setup FFmpeg Cloud Rendering Pipeline + external video editor integrations (CapCut, Canva, Runway logic)
- [ ] Implement Video Preview and Approval UI (Title, Thumbnail, Description, Tags, Visibility)

## Phase 4: AI Autopilot & Recommendation Optimization
- [ ] Build Background Job processing queue (BullMQ/Redis)
- [ ] Implement 30, 60, 90, and 365-day Automation Cycles with Auto-Refresh
- [ ] Implement Scheduled Uploads via YouTube API
- [ ] Build Analytics Loop: Fetch CTR/Retention data to refine future generation (Optimize for YouTube Recommendation)

## Phase 5: Deployment & Monetization
- [ ] Implement Stripe Billing (Tier 1: 30-day, Tier 2: 60-day, Tier 3: 90-day, Tier 4: 365-day)
- [ ] Enforce Public User subscription limits & Owner bypass logic
- [ ] Setup CI/CD Pipeline (GitHub Actions)
- [ ] Deploy Frontend to Vercel/Netlify or Cloud Run
- [ ] Deploy Backend to Google Cloud Run / AWS
- [ ] Public Launch
