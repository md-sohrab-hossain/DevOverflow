'use server';

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { signIn } from '@/auth';
import Account from '@/database/account.model';
import User from '@/database/user.model';

import action from '../handlers/action';
import handleError from '../handlers/error';
import { SignUpSchema } from '../validations';

const SALT_ROUNDS = 12;

async function validateSignupData(params: AuthCredentials): Promise<AuthCredentials | ErrorResponse> {
  const validationResult = await action({ params, schema: SignUpSchema });
  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }
  return validationResult.params as AuthCredentials;
}

function isErrorResponse(data: AuthCredentials | ErrorResponse): data is ErrorResponse {
  return 'error' in data;
}

async function checkExistingCredentials(
  email: string,
  username: string,
  session: mongoose.ClientSession
): Promise<void> {
  const existingUser = await User.findOne({ email }).session(session);
  if (existingUser) {
    throw new Error('User already exists');
  }

  const existingUsername = await User.findOne({ username }).session(session);
  if (existingUsername) {
    throw new Error('Username already exists');
  }
}

async function createUserAccount(
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

export async function signUpWithCredentials(params: AuthCredentials): Promise<ActionResponse> {
  const validatedData = await validateSignupData(params);
  if (isErrorResponse(validatedData)) {
    return validatedData;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, username, email, password } = validatedData;
    await checkExistingCredentials(email, username, session);

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await createUserAccount({ name, username, email }, hashedPassword, session);
    await session.commitTransaction();

    await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    return handleError(error) as ErrorResponse;
  } finally {
    await session.endSession();
  }
}
