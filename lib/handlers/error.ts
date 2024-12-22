import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { RequestError, ValidationError } from '../http-errors';
import logger from '../logger';

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
    logger.error({ err: error }, `${responseType.toUpperCase()} Error: ${error.message}`);
    return formatResponse(responseType, error.statusCode, error.message, error.errors);
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const { fieldErrors } = error.flatten();
    const validationError = new ValidationError(fieldErrors as Record<string, string[]>);

    logger.error({ err: error }, `Validation Error: ${validationError.message}`);
    return formatResponse(responseType, validationError.statusCode, validationError.message, validationError.errors);
  }

  // Handle general errors (Error class)
  if (error instanceof Error) {
    logger.error(error.message);
    return formatResponse(responseType, 500, error.message);
  }

  // Default fallback for unexpected errors
  logger.error({ err: error }, 'An unexpected error occurred');
  return formatResponse(responseType, 500, 'An unexpected error occurred');
};

export default handleError;
