import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { RequestError, ValidationError } from '../http-errors';

export type ResponseType = 'api' | 'server';

const formatResponse = (
  responseType: ResponseType,
  status: number,
  message: string,
  errors?: Record<string, string[]>
) => {
  const responseContent = {
    success: false,
    error: {
      message,
      details: errors,
    },
  };

  return responseType === 'api' ? NextResponse.json(responseContent, { status }) : { status, ...responseContent };
};

const handleError = (error: unknown, responseType: ResponseType = 'server') => {
  // Handle RequestError (custom errors)
  if (error instanceof RequestError) {
    return formatResponse(responseType, error.statusCode, error.message, error.errors);
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const { fieldErrors } = error.flatten();
    const validationError = new ValidationError(fieldErrors as Record<string, string[]>);
    return formatResponse(responseType, validationError.statusCode, validationError.message, validationError.errors);
  }

  // Handle general errors (Error class)
  if (error instanceof Error) {
    return formatResponse(responseType, 500, error.message);
  }

  // Default fallback for unexpected errors
  return formatResponse(responseType, 500, 'An unexpected error occurred');
};

export default handleError;
