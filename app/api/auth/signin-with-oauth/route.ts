// import mongoose from 'mongoose';
// import { NextResponse } from 'next/server';
// import slugify from 'slugify';

// import Account from '@/database/account.model';
// import User, { IUser } from '@/database/user.model';
// import handleError from '@/lib/handlers/error';
// import { ValidationError } from '@/lib/http-errors';
// import logger from '@/lib/logger';
// import dbConnect from '@/lib/mongoose';
// import { SignInWithOAuthSchema } from '@/lib/validations';

// interface IUserData {
//   name: string;
//   username: string;
//   email: string;
//   image?: string;
// }

// interface IValidatedData {
//   provider: string;
//   providerAccountId: string;
//   user: IUserData;
// }

// // Add timeout wrapper
// const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
//   return Promise.race([
//     promise,
//     // eslint-disable-next-line promise/param-names
//     new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)),
//   ]);
// };

// export async function POST(request: Request) {
//   let session: mongoose.ClientSession | null = null;

//   try {
//     // Set connection timeout
//     const connectionPromise = dbConnect();
//     await withTimeout(connectionPromise, 5000); // 5 second timeout for DB connection

//     const { provider, providerAccountId, user } = await request.json();

//     // Validate data before starting transaction
//     const validatedData = validateRequestData({ provider, providerAccountId, user });
//     const { user: userData } = validatedData;

//     // Start transaction with timeout
//     session = await mongoose.startSession();
//     session.startTransaction();

//     // Execute database operations with timeout
//     const operations = async () => {
//       const existingUser = await findOrCreateUser(userData, session!);
//       await findOrCreateAccount(existingUser._id, provider, providerAccountId, userData, session!);
//     };

//     await withTimeout(operations(), 100000); // 10 second timeout for operation
//     await session.commitTransaction(); // Finalizes and saves all changes made within the transaction.
//     return NextResponse.json({ success: true });
//   } catch (error: unknown) {
//     logger.error({ err: error }, 'OAuth Sign-in Error');
//     await session?.abortTransaction(); // Reverts any changes if something goes wrong, maintaining data consistency.
//     return handleError(error, 'api') as APIErrorResponse;
//   } finally {
//     session?.endSession();
//   }
// }

// const validateRequestData = (data: IValidatedData): IValidatedData => {
//   const validatedData = SignInWithOAuthSchema.safeParse(data);

//   if (!validatedData.success) {
//     throw new ValidationError(validatedData.error.flatten().fieldErrors);
//   }

//   return validatedData.data;
// };

// const findOrCreateUser = async (userData: IUserData, session: mongoose.ClientSession) => {
//   const { name, username, email, image } = userData;

//   const normalizedUsername = slugify(username, { lower: true, strict: true, trim: true });

//   let existingUser = await User.findOne({ email }).session(session);

//   if (!existingUser) {
//     [existingUser] = await User.create([{ name, username: normalizedUsername, email, image }], { session });
//   } else {
//     await updateUserIfNecessary(existingUser, userData, session);
//   }

//   return existingUser;
// };

// const updateUserIfNecessary = async (existingUser: IUser, userData: IUserData, session: mongoose.ClientSession) => {
//   const { name, image } = userData;
//   const updatedData: { name?: string; image?: string } = {};

//   if (existingUser.name !== name) updatedData.name = name;
//   if (existingUser.image !== image) updatedData.image = image;
//   if (Object.keys(updatedData).length > 0) {
//     await User.updateOne({ _id: existingUser._id }, { $set: updatedData }).session(session);
//   }
// };

// const findOrCreateAccount = async (
//   userId: mongoose.Types.ObjectId,
//   provider: string,
//   providerAccountId: string,
//   userData: IUserData,
//   session: mongoose.ClientSession
// ) => {
//   const { name, image } = userData;

//   const existingAccount = await Account.findOne({ userId, provider, providerAccountId }).session(session);

//   if (existingAccount) {
//     return existingAccount;
//   }

//   const newAccount = await Account.create(
//     [
//       {
//         userId,
//         name,
//         image,
//         provider,
//         providerAccountId,
//       },
//     ],
//     { session }
//   );

//   return newAccount;
// };

import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import slugify from 'slugify';

import Account from '@/database/account.model';
import User, { IUser } from '@/database/user.model';
import handleError from '@/lib/handlers/error';
import { ValidationError } from '@/lib/http-errors';
import logger from '@/lib/logger';
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

// Retry logic for database connection
const connectWithRetry = async (retries: number = 5, delay: number = 3000): Promise<void> => {
  let attempts = 0;
  while (attempts < retries) {
    try {
      await dbConnect();
      console.log('Database connection successful');
      return;
    } catch (error) {
      attempts++;
      console.log({ err: error }, `Database connection failed. Attempt ${attempts} of ${retries}`);
      if (attempts >= retries) {
        throw new Error('Database connection failed after multiple attempts');
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    // eslint-disable-next-line promise/param-names
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)),
  ]);
};

export async function POST(request: Request) {
  let session: mongoose.ClientSession | null = null;

  try {
    console.log('Starting POST request handler');
    await connectWithRetry();

    const { provider, providerAccountId, user } = await request.json();
    console.log('Received request data', { provider, providerAccountId, user });

    const validatedData = validateRequestData({ provider, providerAccountId, user });
    console.log('Validated request data', validatedData);
    const { user: userData } = validatedData;

    session = await mongoose.startSession();
    session.startTransaction();
    console.log('Started MongoDB session and transaction');

    const operations = async () => {
      const existingUser = await findOrCreateUser(userData, session!);
      console.log('Found or created user', existingUser);
      await findOrCreateAccount(existingUser._id, provider, providerAccountId, userData, session!);
      console.log('Found or created account');
    };

    await withTimeout(operations(), 10000); // Set timeout for 10 seconds

    await session.commitTransaction();
    console.log('Committed MongoDB transaction');
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error({ err: error }, 'OAuth Sign-in Error');
    await session?.abortTransaction();
    console.log('Aborted MongoDB transaction');
    return handleError(error, 'api') as APIErrorResponse;
  } finally {
    session?.endSession();
    console.log('Ended MongoDB session');
  }
}

const validateRequestData = (data: IValidatedData): IValidatedData => {
  console.log('Validating request data', data);
  const validatedData = SignInWithOAuthSchema.safeParse(data);

  if (!validatedData.success) {
    logger.error('Validation error', validatedData.error.flatten().fieldErrors);
    throw new ValidationError(validatedData.error.flatten().fieldErrors);
  }

  console.log('Validation successful', validatedData.data);
  return validatedData.data;
};

const findOrCreateUser = async (userData: IUserData, session: mongoose.ClientSession) => {
  console.log('Finding or creating user', userData);
  const { name, username, email, image } = userData;
  const normalizedUsername = slugify(username, { lower: true, strict: true, trim: true });

  let existingUser = await User.findOne({ email }).session(session);

  if (!existingUser) {
    console.log('User not found, creating new user');
    [existingUser] = await User.create([{ name, username: normalizedUsername, email, image }], { session });
  } else {
    console.log('User found, updating if necessary');
    await updateUserIfNecessary(existingUser, userData, session);
  }

  console.log('User found or created', existingUser);
  return existingUser;
};

const updateUserIfNecessary = async (existingUser: IUser, userData: IUserData, session: mongoose.ClientSession) => {
  console.log('Updating user if necessary', { existingUser, userData });
  const { name, image } = userData;
  const updatedData: { name?: string; image?: string } = {};

  if (existingUser.name !== name) updatedData.name = name;
  if (existingUser.image !== image) updatedData.image = image;
  if (Object.keys(updatedData).length > 0) {
    console.log('Updating user', updatedData);
    await User.updateOne({ _id: existingUser._id }, { $set: updatedData }).session(session);
  } else {
    console.log('No user updates necessary');
  }
};

const findOrCreateAccount = async (
  userId: mongoose.Types.ObjectId,
  provider: string,
  providerAccountId: string,
  userData: IUserData,
  session: mongoose.ClientSession
) => {
  console.log('Finding or creating account', { userId, provider, providerAccountId, userData });
  const { name, image } = userData;

  const existingAccount = await Account.findOne({ userId, provider, providerAccountId }).session(session);

  if (existingAccount) {
    console.log('Account found', existingAccount);
    return existingAccount;
  }

  console.log('Account not found, creating new account');
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

  console.log('New account created', newAccount);
  return newAccount;
};
