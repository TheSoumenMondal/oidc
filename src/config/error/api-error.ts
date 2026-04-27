import { StatusCodes } from "http-status-codes";
import type { ZodError } from "zod";

class ApiError extends Error {
  private statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  getStatusCode(): number {
    return this.statusCode;
  }

  public static zodError(error: ZodError): ApiError {
    const formattedIssues = error.issues.map((issue, index) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${index + 1}. ${path}: ${issue.message}`;
    });
    const message = `Validation failed:\n${formattedIssues.join("\n")}`;
    return new ApiError(message, StatusCodes.BAD_REQUEST);
  }

  public static dbConnectionError(): ApiError {
    return new ApiError("Failed to connect to the database", StatusCodes.SERVICE_UNAVAILABLE);
  }

  public static notFound(message: string): ApiError {
    return new ApiError(message, StatusCodes.NOT_FOUND);
  }

  public static internalServerError(message: string): ApiError {
    return new ApiError(message, StatusCodes.INTERNAL_SERVER_ERROR);
  }

  public static conflict(message: string): ApiError {
    return new ApiError(message, StatusCodes.CONFLICT);
  }
}

export { ApiError };
