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
import { SignInSchema, SignUpSchema } from '../validations';

const SALT_ROUNDS = 12;

async function validateSchema<T>(params: T, schema: z.ZodSchema): Promise<T | ErrorResponse> {
  const result = await action({ params, schema });
  if (result instanceof Error) {
    return handleError(result) as ErrorResponse;
  }
  return result.params as T;
}

function isErrorResponse(
  data: AuthCredentials | Pick<AuthCredentials, 'email' | 'password'> | ErrorResponse
): data is ErrorResponse {
  return 'error' in data;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

async function findUserByEmail(email: string, session?: mongoose.ClientSession) {
  return User.findOne({ email }).session(session || null);
}

async function findUserByUsername(username: string, session?: mongoose.ClientSession) {
  return User.findOne({ username }).session(session || null);
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

async function createUserWithAccount(
  userData: Omit<AuthCredentials, 'password'>,
  hashedPassword: string,
  session: mongoose.ClientSession
): Promise<void> {
  const [newUser] = await User.create([userData], { session });

  await Account.create(
    [
      {
        userId: newUser._id,
        name: userData.name,
        provider: 'credentials',
        providerAccountId: userData.email,
        password: hashedPassword,
      },
    ],
    { session }
  );
}

async function validateUniqueCredentials(
  email: string,
  username: string,
  session: mongoose.ClientSession
): Promise<void> {
  const [existingUser, existingUsername] = await Promise.all([
    findUserByEmail(email, session),
    findUserByUsername(username, session),
  ]);

  if (existingUser) throw new Error('User already exists');
  if (existingUsername) throw new Error('Username already exists');
}

export async function signUpWithCredentials(credentials: AuthCredentials): Promise<ActionResponse> {
  const validatedData = await validateSchema(credentials, SignUpSchema);
  if (isErrorResponse(validatedData)) {
    return validatedData;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, username, email, password } = validatedData;
    await validateUniqueCredentials(email, username!, session);

    const hashedPassword = await hashPassword(password);
    await createUserWithAccount({ name, username, email }, hashedPassword, session);
    await session.commitTransaction();

    await authenticateUser(email, password);
    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    return handleError(error) as ErrorResponse;
  } finally {
    await session.endSession();
  }
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
