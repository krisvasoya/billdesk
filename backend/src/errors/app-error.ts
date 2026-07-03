// backend/src/errors/app-error.ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors: any;

  constructor(message: string, statusCode = 500, errors: any = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
