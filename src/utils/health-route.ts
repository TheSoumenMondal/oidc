import type { Request, Response } from "express";

const healthRoute = (serviceName: string) => (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: `${serviceName} is up and running.`,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};

export { healthRoute };
