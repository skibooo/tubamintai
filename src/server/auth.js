import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma.js";

export const authRouter = Router();

// Retries a Prisma call if Supabase is still waking up from its free-tier sleep.
// Waits longer between each attempt since cold starts can take 20-40+ seconds.
async function withDbRetry(fn, { retries = 5, delayMs = 6000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isConnectionError =
        err?.message?.includes("Can't reach database server") ||
        err?.code === "P1001";

      if (!isConnectionError || attempt === retries) {
        throw err;
      }

      console.warn(
        `DB not reachable (attempt ${attempt}/${retries}) — likely Supabase waking up. Retrying in ${delayMs / 1000}s...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

// SIGNUP
authRouter.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existing = await withDbRetry(() => prisma.user.findUnique({ where: { email } }));
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await withDbRetry(() =>
      prisma.user.create({
        data: {
          email,
          name: name || null,
          passwordHash,
        },
      })
    );

    res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong during signup" });
  }
});

// LOGIN
authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await withDbRetry(() => prisma.user.findUnique({ where: { email } }));
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenantId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong during login" });
  }
});