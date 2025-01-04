'use server';

import { Session } from 'next-auth';
import { ZodError, ZodSchema } from 'zod';

import { auth } from '@/auth';

import { UnauthorizedError, ValidationError } from '../http-errors';
import dbConnect from '../mongoose';

type ActionResult<T> = {
  params: T;
  session: Session | null;
};

type ActionOptions<T> = {
  params?: T;
  schema?: ZodSchema<T>;
  authorize?: boolean;
};

// 1. Checking whether the schema and params are provided and validated.
// 2. Checking whether the user is authorized.
// 3. Connecting to the database.
// 4. Returning the params and session.

async function validateSchema<T>(params: T, schema: ZodSchema<T>) {
  try {
    schema.parse(params);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(error.flatten().fieldErrors as Record<string, string[]>);
    }
    throw new Error('Schema validation failed');
  }
}

async function action<T>({ params, schema, authorize = false }: ActionOptions<T>): Promise<ActionResult<T>> {
  try {
    if (schema && params) {
      await validateSchema(params, schema);
    }

    const session = authorize ? await auth() : null;
    if (authorize && !session) {
      throw new UnauthorizedError();
    }

    await dbConnect();

    return { params: params as T, session };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred');
  }
}

export default action;
