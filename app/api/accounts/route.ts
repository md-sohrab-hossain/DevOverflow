import { NextResponse } from 'next/server';

import Account from '@/database/account.model';
import handleError from '@/lib/handlers/error';
import { ForbiddenError } from '@/lib/http-errors';
import dbConnect from '@/lib/mongoose';
import { AccountSchema } from '@/lib/validations';

// GET api/accounts
export async function GET() {
  try {
    const accounts = await getAllAccounts();
    return NextResponse.json({ success: true, data: accounts }, { status: 200 });
  } catch (error) {
    return handleError(error, 'api') as APIErrorResponse;
  }
}

// POST api/accounts
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = AccountSchema.parse(body);

    // Check if account with the same provider and providerAccountId already exists
    const existingAccount = await checkExistingAccount(validatedData.provider, validatedData.providerAccountId);
    if (existingAccount) throw new ForbiddenError('An account with the same provider already exists');

    // Create new account
    const newAccount = await createAccount(validatedData);
    return NextResponse.json({ success: true, data: newAccount }, { status: 201 });
  } catch (error) {
    return handleError(error, 'api') as APIErrorResponse;
  }
}

async function getAllAccounts() {
  await dbConnect();
  return Account.find({});
}

async function checkExistingAccount(provider: string, providerAccountId: string) {
  return await Account.findOne({ provider, providerAccountId });
}

async function createAccount(validatedData: unknown) {
  return await Account.create(validatedData);
}
