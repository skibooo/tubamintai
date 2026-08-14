import { Router } from "express";

export const uniquenessRouter = Router();

uniquenessRouter.get("/", (req, res) => {
  res.status(501).json({ error: "Not implemented yet" });
});