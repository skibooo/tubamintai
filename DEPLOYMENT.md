# YOUTUBAMINTAI Deployment Plan

## Infrastructure Overview
- **Frontend Hosting:** Google Cloud Run (Containerized SPA) or Vercel
- **Backend Hosting:** Google Cloud Run (Node.js API)
- **Database:** Google Cloud SQL (PostgreSQL) or Supabase
- **Storage:** Google Cloud Storage / AWS S3 (for rendered videos and media assets)
- **Background Jobs:** Redis + BullMQ (hosted on Memorystore or Render)

## Environment Variables Needed
```env
# Server
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://youtubamintai.com

# Database
DATABASE_URL=postgresql://user:password@host:port/dbname

# Authentication & OAuth
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
YOUTUBE_API_KEY=your_youtube_api_key

# AI Providers
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Media APIs
ELEVENLABS_API_KEY=your_elevenlabs_api_key
IMAGE_GEN_API_KEY=your_image_api_key

# Storage
GCS_BUCKET_NAME=youtubamintai-assets
GCP_PROJECT_ID=your_gcp_project_id

# Billing
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

## Scaling Strategy
1. **Media Rendering:** Isolate FFmpeg processing to dedicated, high-CPU worker instances to prevent API blocking.
2. **AI Limits:** Use token tracking and rate limiting per user tier.
3. **Storage:** Implement lifecycle policies on GCS to auto-delete temporary media assets after video compilation or 30 days.
