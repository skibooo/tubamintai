import { Router } from "express";

export const blogRouter = Router();

blogRouter.get("/", (req, res) => {
  res.status(501).json({ error: "Not implemented yet" });
});