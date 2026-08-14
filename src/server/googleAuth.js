import { Router } from "express";
import { google } from "googleapis";
import { prisma } from "./prisma.js";
import { requireAuth } from "./middleware.js";

export const googleAuthRouter = Router();

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// GET /api/auth/google — must be logged in; redirects to Google's consent screen
googleAuthRouter.get("/google", requireAuth, (req, res) => {
  const oauth2Client = getOAuthClient();

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/youtube.upload"],
    state: req.user.id,
  });

  res.redirect(url);
});

// GET /api/auth/google/callback — PUBLIC (Google redirects the browser here directly, no auth header possible)
googleAuthRouter.get("/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state;

    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    await prisma.oAuthToken.upsert({
      where: { userId_provider: { userId, provider: "youtube" } },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expiry_date),
        grantedScopes: tokens.scope,
      },
      create: {
        userId,
        provider: "youtube",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expiry_date),
        grantedScopes: tokens.scope,
      },
    });

    res.send("YouTube account connected successfully! You can close this tab.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to connect YouTube account.");
  }
});