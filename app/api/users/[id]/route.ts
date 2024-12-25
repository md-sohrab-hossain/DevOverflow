import { NextResponse } from 'next/server';

import User from '@/database/user.model';
import handleError from '@/lib/handlers/error';
import { NotFoundError } from '@/lib/http-errors';
import dbConnect from '@/lib/mongoose';
import { UserSchema } from '@/lib/validations';

// GET api/users/[id]
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) throw new NotFoundError('User');

  try {
    const user = await getUserById(id);
    return NextResponse.json({ success: true, data: user }, { status: 200 });
  } catch (error) {
    return handleError(error, 'api') as APIErrorResponse;
  }
}

// DELETE api/users/[id]
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) throw new NotFoundError('User');

  try {
    const user = await deleteUserById(id);
    return NextResponse.json({ success: true, data: user }, { status: 200 });
  } catch (error) {
    return handleError(error, 'api') as APIErrorResponse;
  }
}

// PUT api/users/[id]
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) throw new NotFoundError('User');

  try {
    const body = await request.json();
    const updatedUser = await updateUser(id, body);
    return NextResponse.json({ success: true, data: updatedUser }, { status: 200 });
  } catch (error) {
    return handleError(error, 'api') as APIErrorResponse;
  }
}

async function getUserById(id: string) {
  await dbConnect();
  const user = await User.findById(id);
  if (!user) throw new NotFoundError('User');
  return user;
}

async function deleteUserById(id: string) {
  await dbConnect();
  const user = await User.findByIdAndDelete(id);
  if (!user) throw new NotFoundError('User');
  return user;
}

async function updateUser(id: string, body: unknown) {
  await dbConnect();
  const validateData = UserSchema.partial().parse(body); // Partial validation
  const updatedUser = await User.findByIdAndUpdate(id, validateData, { new: true });
  if (!updatedUser) throw new NotFoundError('User');
  return updatedUser;
}
