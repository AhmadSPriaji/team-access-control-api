import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const id = crypto.randomUUID();
  (req as any).id = id;
  res.setHeader("x-request-id", id);
  next();
};
