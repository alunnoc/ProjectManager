import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }
  // Log completo per debug (visibile nel terminale del backend)
  console.error("[500]", err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  // In sviluppo restituisci il messaggio reale al client
  const message =
    process.env.NODE_ENV !== "production" && err instanceof Error
      ? err.message
      : "Errore interno del server";
  res.status(500).json({
    error: message,
    code: "INTERNAL_ERROR",
  });
}
