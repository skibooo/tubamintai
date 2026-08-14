import { Router } from "express";

export const agentRouter = Router();

agentRouter.post("/chat", (req, res) => {
  res.status(501).json({ error: "Not implemented yet" });
});