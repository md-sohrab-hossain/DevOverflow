'use server';

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';

import { signIn } from '@/auth';
import Account from '@/database/account.model';
import User from '@/database/user.model';

import action from '../handlers/action';
import handleError from '../handlers/error';
import { NotFoundError } from '../http-errors';
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

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

async function findUserByEmail(email: string, session?: mongoose.ClientSession) {
  return User.findOne({ email }).session(session || null);
}

async function findAccount(email: string) {
  return Account.findOne({
    provider: 'credentials',
    providerAccountId: email,
  });
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

    const user = await findUserByEmail(email);
    if (!user) throw new NotFoundError('User');

    const account = await findAccount(email);
    if (!account) throw new NotFoundError('Account');

    const isValidPassword = await verifyPassword(password, account.password);
    if (!isValidPassword) throw new Error('Invalid password');

    await authenticateUser(email, password);
    return { success: true };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}
