import type { ZodError } from "zod";

class ApiError extends Error {
  private readonly statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  public getStatusCode() {
    return this.statusCode;
  }

  static badRequest(message: string) {
    return new ApiError(400, message);
  }

  static unauthorized(message: string) {
    return new ApiError(401, message);
  }

  static notFound(message: string) {
    return new ApiError(404, message);
  }

  static conflict(message: string) {
    return new ApiError(409, message);
  }

  static zodError(error: ZodError) {
    const message = error.issues.map((err) => `${err.path.join(".")}: ${err.message}`).join(", ");
    return new ApiError(400, `Validation error: ${message}`);
  }
}

export { ApiError };
