import { BaseError } from "./base.error.js";
import { ErrorCode } from "./error-code.js";

export class ValidationError extends BaseError {
  constructor(
    message = "Validation failed",
    details?: unknown
  ) {
    super(
      message,
      ErrorCode.VALIDATION_ERROR,
      400,
      details
    );
  }
}