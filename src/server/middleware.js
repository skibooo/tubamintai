import { prisma } from "./prisma.js";
import jwt from "jsonwebtoken";

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = req.headers['authorization']?.split(' ')[1] || req.query.token;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
      activeCycleExpiresAt: user.activeCycleExpiresAt,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};