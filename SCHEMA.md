# YOUTUBAMINTAI Database Schema

## Core Tables

### `users` (Multi-tenant isolation)
- `id` (UUID, PK)
- `tenant_id` (UUID, Unique) - Ensures full multi-tenancy isolation.
- `email` (String, Unique)
- `name` (String)
- `avatar_url` (String)
- `role` (Enum: OWNER, PUBLIC) - OWNER has lifetime unlimited access. PUBLIC is subscription-based.
- `plan_tier` (Enum: Free, Tier1_30, Tier2_60, Tier3_90, Tier4_365)
- `active_cycle_expires_at` (Timestamp)
- `auto_refresh_enabled` (Boolean) - Auto-renews the automation cycle content generation.
- `created_at` (Timestamp)

### `oauth_tokens`
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `provider` (String) - e.g., 'youtube'
- `access_token` (String)
- `refresh_token` (String)
- `expires_at` (Timestamp)
- `granted_scopes` (JSONB) - Ensure upload, manage videos, read analytics.

### `channels`
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `youtube_channel_id` (String)
- `title` (String)
- `niche` (String)
- `is_active` (Boolean)

### `creation_modes`
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `mode_type` (Enum: creator_mode, ai_autopilot)
- `created_at` (Timestamp)

### `videos` (Projects/Jobs)
- `id` (UUID, PK)
- `channel_id` (UUID, FK)
- `tenant_id` (UUID, FK) - Multi-tenancy check.
- `status` (Enum: drafting, rendering, review, approved, uploaded, failed)
- `title` (String)
- `description` (Text)
- `script_json` (JSONB)
- `storyboard_json` (JSONB)
- `media_urls` (JSONB)
- `tags` (Array of String)
- `content_hash` (String, Unique) - Hash of topic + script to ensure ABSOLUTE UNIQUENESS across all tenants.
- `created_at` (Timestamp)

### `automation_cycles`
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `channel_id` (UUID, FK)
- `duration_days` (Int) - 30, 60, 90, or 365
- `start_date` (Timestamp)
- `end_date` (Timestamp)
- `is_active` (Boolean)
- `auto_refresh` (Boolean)

### `automation_jobs`
- `id` (UUID, PK)
- `cycle_id` (UUID, FK, nullable)
- `user_id` (UUID, FK)
- `channel_id` (UUID, FK)
- `status` (Enum: pending, running, paused, completed, failed)
- `current_step` (String)
- `logs_json` (JSONB)
- `created_at` (Timestamp)

### `analytics` (Recommendation Focus)
- `id` (UUID, PK)
- `channel_id` (UUID, FK)
- `video_id` (UUID, FK, nullable)
- `views` (Int)
- `ctr` (Float) - Critical for YouTube Recommendation AI optimizations.
- `watch_time_hours` (Float)
- `retention_rate` (Float) - Crucial for script/pacing improvements.
- `recorded_at` (Timestamp)

### `chat_history`
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `role` (Enum: user, assistant)
- `content` (Text)
- `created_at` (Timestamp)
