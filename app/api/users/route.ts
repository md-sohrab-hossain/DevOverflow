import { NextResponse } from 'next/server';

import User, { IUser } from '@/database/user.model';
import handleError from '@/lib/handlers/error';
import { ValidationError } from '@/lib/http-errors';
import dbConnect from '@/lib/mongoose';
import { UserSchema } from '@/lib/validations';

export async function GET() {
  try {
    await dbConnect();
    const users = await User.find({});
    return NextResponse.json({ success: true, data: users }, { status: 200 });
  } catch (error) {
    return handleError(error, 'api') as APIErrorResponse;
  }
}

export async function POST(request: Request): Promise<NextResponse | APIErrorResponse> {
  try {
    await dbConnect();

    const body = await request.json();
    const validatedData = validateUserData(body);

    const { email, username } = validatedData;
    await checkIfUserExists(email, username);

    const newUser = await createUser(validatedData);
    return NextResponse.json({ success: true, data: newUser }, { status: 201 });
  } catch (error) {
    return handleError(error, 'api') as APIErrorResponse;
  }
}

const validateUserData = (body: unknown) => {
  const validatedData = UserSchema.safeParse(body);

  if (!validatedData.success) {
    throw new ValidationError(validatedData.error.flatten().fieldErrors);
  }

  return validatedData.data;
};

const checkIfUserExists = async (email: string, username: string) => {
  const [existingUser, existingUsername] = await Promise.all([User.findOne({ email }), User.findOne({ username })]);

  if (existingUser) throw new Error('User already exists');
  if (existingUsername) throw new Error('Username already exists');
};

const createUser = async (userData: unknown): Promise<IUser> => {
  const newUser = await User.create(userData);

  return newUser;
};
