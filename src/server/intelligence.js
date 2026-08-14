import { Router } from "express";

export const intelligenceRouter = Router();

intelligenceRouter.get("/", (req, res) => {
  res.status(501).json({ error: "Not implemented yet" });
});