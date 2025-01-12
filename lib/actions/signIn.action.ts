'use server';

import { z } from 'zod';

import { signIn } from '@/auth';

import action from '../handlers/action';
import handleError from '../handlers/error';
import { SignInSchema } from '../validations';

async function validateSchema<T>(params: T, schema: z.ZodSchema): Promise<T | ErrorResponse> {
  const result = await action({ params, schema });
  if (result instanceof Error) {
    return handleError(result) as ErrorResponse;
  }
  return result.params as T;
}

function isErrorResponse(data: Pick<AuthCredentials, 'email' | 'password'> | ErrorResponse): data is ErrorResponse {
  return 'error' in data;
}

async function authenticateUser(email: string, password: string) {
  return signIn('credentials', { email, password, redirect: false });
}

export async function signInWithCredentials(
  credentials: Pick<AuthCredentials, 'email' | 'password'>
): Promise<ActionResponse> {
  const validatedData = await validateSchema(credentials, SignInSchema);
  if (isErrorResponse(validatedData)) {
    return validatedData;
  }

  try {
    const { email, password } = validatedData;

    await authenticateUser(email, password);
    return { success: true };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}
