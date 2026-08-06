import { ErrorCode } from "./error-code.js";

export abstract class BaseError extends Error {
  readonly code: ErrorCode;

  readonly status: number;

  readonly details?: unknown;

  protected constructor(
    message: string,
    code: ErrorCode,
    status: number,
    details?: unknown
  ) {
    super(message);

    this.name = new.target.name;

    this.code = code;

    this.status = status;

    this.details = details;

    Error.captureStackTrace?.(
      this,
      new.target
    );
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      status: this.status,
      details: this.details
    };
  }
}