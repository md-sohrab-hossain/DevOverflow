// Base class for all custom request errors
export class RequestError extends Error {
  statusCode: number;
  errors?: Record<string, string[]>;

  constructor(statusCode: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = this.constructor.name; // Set the class name dynamically
    Object.setPrototypeOf(this, new.target.prototype); // Ensure correct prototype chain
  }
}

// ValidationError class for handling validation errors
export class ValidationError extends RequestError {
  constructor(fieldErrors: Record<string, string[]>) {
    const message = ValidationError.formatFieldErrors(fieldErrors);
    super(400, message, fieldErrors);
  }

  // Format the validation errors into a human-readable string
  static formatFieldErrors(errors: Record<string, string[]>): string {
    return Object.entries(errors)
      .map(([field, messages]) => {
        const formattedField = field.charAt(0).toUpperCase() + field.slice(1);
        if (messages.includes('Required')) {
          return `${formattedField} is required`;
        } else {
          return `${formattedField}: ${messages.join(' and ')}`;
        }
      })
      .join(', ');
  }
}

export class NotFoundError extends RequestError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
  }
}

export class ForbiddenError extends RequestError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
  }
}

export class UnauthorizedError extends RequestError {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
  }
}
