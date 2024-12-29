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
//     await withTimeout(connectionPromise, 200000); // 20 second timeout for DB connection

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
import User from '@/database/user.model';
import handleError from '@/lib/handlers/error';
import { ValidationError } from '@/lib/http-errors';
import dbConnect from '@/lib/mongoose';
import { SignInWithOAuthSchema } from '@/lib/validations';

export async function POST(request: Request) {
  const { provider, providerAccountId, user } = await request.json();

  await dbConnect();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const validatedData = SignInWithOAuthSchema.safeParse({
      provider,
      providerAccountId,
      user,
    });

    if (!validatedData.success) throw new ValidationError(validatedData.error.flatten().fieldErrors);

    const { name, username, email, image } = user;

    const slugifiedUsername = slugify(username, {
      lower: true,
      strict: true,
      trim: true,
    });

    let existingUser = await User.findOne({ email }).session(session);

    if (!existingUser) {
      [existingUser] = await User.create([{ name, username: slugifiedUsername, email, image }], { session });
    } else {
      const updatedData: { name?: string; image?: string } = {};

      if (existingUser.name !== name) updatedData.name = name;
      if (existingUser.image !== image) updatedData.image = image;

      if (Object.keys(updatedData).length > 0) {
        await User.updateOne({ _id: existingUser._id }, { $set: updatedData }).session(session);
      }
    }

    const existingAccount = await Account.findOne({
      userId: existingUser._id,
      provider,
      providerAccountId,
    }).session(session);

    if (!existingAccount) {
      await Account.create(
        [
          {
            userId: existingUser._id,
            name,
            image,
            provider,
            providerAccountId,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    await session.abortTransaction();
    return handleError(error, 'api') as APIErrorResponse;
  } finally {
    session.endSession();
  }
}
