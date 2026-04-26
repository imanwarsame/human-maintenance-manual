import type { Request, Response, NextFunction } from 'express';

export function mcpAuth(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.MCP_SECRET;
  if (!secret) {
    next();
    return;
  }
  const header = req.headers.authorization;
  if (header !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorised' });
    return;
  }
  next();
}
