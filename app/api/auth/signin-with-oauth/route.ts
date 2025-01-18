import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import slugify from 'slugify';

import Account from '@/database/account.model';
import User, { IUserDoc } from '@/database/user.model';
import handleError from '@/lib/handlers/error';
import { ValidationError } from '@/lib/http-errors';
import dbConnect from '@/lib/mongoose';
import { SignInWithOAuthSchema } from '@/lib/validations';

interface IUserData {
  name: string;
  username: string;
  email: string;
  image?: string;
}

interface IValidatedData {
  provider: string;
  providerAccountId: string;
  user: IUserData;
}

export async function POST(request: Request) {
  const { provider, providerAccountId, user } = await request.json();

  await dbConnect();

  let transactionCommitted = false;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const validatedData = validateRequestData({ provider, providerAccountId, user });
    const { user: userData } = validatedData;

    const existingUser = await findOrCreateUser(userData, session);
    await findOrCreateAccount(existingUser._id, provider, providerAccountId, userData, session);

    transactionCommitted = true;
    await session.commitTransaction(); // Finalizes and saves all changes made within the transaction.
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (!transactionCommitted) await session.abortTransaction(); // Reverts any changes if something goes wrong, maintaining data consistency.
    return handleError(error, 'api') as APIErrorResponse;
  } finally {
    session.endSession();
  }
}

const validateRequestData = (data: IValidatedData): IValidatedData => {
  const validatedData = SignInWithOAuthSchema.safeParse(data);

  if (!validatedData.success) {
    throw new ValidationError(validatedData.error.flatten().fieldErrors);
  }

  return validatedData.data;
};

const findOrCreateUser = async (userData: IUserData, session: mongoose.ClientSession) => {
  const { name, username, email, image } = userData;

  const normalizedUsername = slugify(username, { lower: true, strict: true, trim: true });

  let existingUser = await User.findOne({ email }).session(session);

  if (!existingUser) {
    [existingUser] = await User.create([{ name, username: normalizedUsername, email, image }], { session });
  } else {
    await updateUserIfNecessary(existingUser, userData, session);
  }

  return existingUser;
};

const updateUserIfNecessary = async (existingUser: IUserDoc, userData: IUserData, session: mongoose.ClientSession) => {
  const { name, image } = userData;
  const updatedData: { name?: string; image?: string } = {};

  if (existingUser.name !== name) updatedData.name = name;
  if (existingUser.image !== image) updatedData.image = image;
  if (Object.keys(updatedData).length > 0) {
    await User.updateOne({ _id: existingUser._id }, { $set: updatedData }).session(session);
  }
};

const findOrCreateAccount = async (
  userId: mongoose.Types.ObjectId,
  provider: string,
  providerAccountId: string,
  userData: IUserData,
  session: mongoose.ClientSession
) => {
  const { name, image } = userData;

  const existingAccount = await Account.findOne({ userId, provider, providerAccountId }).session(session);

  if (existingAccount) {
    return existingAccount;
  }

  const newAccount = await Account.create(
    [
      {
        userId,
        name,
        image,
        provider,
        providerAccountId,
      },
    ],
    { session }
  );

  return newAccount;
};
