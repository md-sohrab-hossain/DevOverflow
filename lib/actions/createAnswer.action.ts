'use server';
import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import ROUTES from '@/constants/routes';
import { Question } from '@/database';
import Answer, { IAnswerDoc } from '@/database/answer.model';

import action from '../handlers/action';
import handleError from '../handlers/error';
import { AnswerServerSchema } from '../validations';

/**
 * Creates a new answer for a question and updates the question's answer count.
 * @param params - Object containing the answer content and question ID.
 * @returns Promise resolving to either a success response with the created answer or an error response.
 */
export async function createAnswer(params: CreateAnswerParams): Promise<ActionResponse> {
  // Step 1: Validate input parameters and user authorization
  const validationResult = await validateInput(params);
  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  // Step 2: Extract and validate user session data
  const { content, questionId } = validationResult.params!;
  const userId = validationResult.session?.user?.id;

  if (!userId) {
    return handleError('User not authenticated') as ErrorResponse;
  }

  // Step 3: Perform database operations within a transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Step 4: Create answer and update question
    const result = await createAnswerAndUpdateQuestion({
      content,
      questionId,
      userId,
      session,
    });

    // Step 5: Commit transaction and revalidate page
    await session.commitTransaction();
    revalidatePath(ROUTES.QUESTION(questionId));

    return {
      success: true,
      data: JSON.parse(JSON.stringify(result)),
    };
  } catch (error) {
    await session.abortTransaction();
    return handleError(error) as ErrorResponse;
  } finally {
    await session.endSession();
  }
}

/**
 * Validates the input parameters and user authorization.
 * @param params - Parameters to validate.
 * @returns Validation result or error.
 */
async function validateInput<T>(params: T) {
  return action({
    params,
    schema: AnswerServerSchema as z.ZodSchema,
    authorize: true,
  });
}

/**
 * Performs the database operations to create an answer and update the question.
 * @param content - Content of the answer.
 * @param questionId - ID of the question.
 * @param userId - ID of the user.
 * @param session - Mongoose session.
 * @returns Created answer document.
 */
async function createAnswerAndUpdateQuestion({
  content,
  questionId,
  userId,
  session,
}: {
  content: string;
  questionId: string;
  userId: string;
  session: mongoose.ClientSession;
}): Promise<IAnswerDoc> {
  const question = await Question.findById(questionId);
  if (!question) {
    throw new Error('Question not found');
  }

  // Create the answer
  const [newAnswer] = await Answer.create(
    [
      {
        author: userId,
        question: questionId,
        content,
      },
    ],
    { session }
  );

  if (!newAnswer) {
    throw new Error('Failed to create answer');
  }

  // Update question's answer count
  question.answers += 1;
  await question.save({ session });

  return newAnswer;
}
