# YOUTUBAMINTAI API Reference

## Authentication
- `POST /api/auth/login` - Standard email/password login
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Handle Google OAuth callback

## Channels
- `GET /api/channels` - List user's connected channels
- `POST /api/channels` - Register a new channel profile
- `GET /api/channels/:id/analytics` - Fetch channel analytics

## AI Engine
- `POST /api/ai/chat` - Chatbot endpoint (handles commands and natural language)
- `POST /api/ai/niche-analysis` - Generates niche recommendations
- `POST /api/ai/script` - Generates or refines a video script
- `POST /api/ai/metadata` - Generates SEO title, description, tags

## Media & Production
- `POST /api/media/voice` - Generates TTS audio
- `POST /api/media/image` - Generates scene images based on prompts
- `POST /api/media/render` - Combines audio, images, and captions into a video

## Automation Jobs
- `GET /api/automation` - List active AI Autopilot jobs
- `POST /api/automation/start` - Trigger a new autopilot workflow
- `POST /api/automation/:id/approve` - Approve a completed job for upload
- `POST /api/automation/:id/pause` - Pause an active automation workflow

## YouTube
- `POST /api/youtube/upload` - Upload an approved video to YouTube
- `GET /api/youtube/status/:videoId` - Check YouTube processing status
