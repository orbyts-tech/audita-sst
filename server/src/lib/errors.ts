export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toErrorResponse(err: unknown) {
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      body: {
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      },
    };
  }
  return {
    statusCode: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "Erro interno. Consulte os logs do servidor.",
      },
    },
  };
}
