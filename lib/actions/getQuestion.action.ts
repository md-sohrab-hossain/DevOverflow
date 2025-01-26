'use server';

import { ZodSchema } from 'zod';

import Question from '@/database/question.model';

import action from '../handlers/action';
import handleError from '../handlers/error';
import { GetQuestionSchema } from '../validations';

/**
 * Validates parameters for retrieving a question
 * Ensures questionId is valid and user is authorized
 */
async function validateGetQuestion<T>(params: T) {
  return await action({
    params,
    schema: GetQuestionSchema as ZodSchema,
  });
}

/**
 * Retrieves a question by ID with populated tags
 * Simple read operation with validation and error handling
 */
export async function getQuestion(
  params: GetQuestionParams & { incrementView?: boolean }
): Promise<ActionResponse<Question>> {
  const validationResult = await validateGetQuestion(params);
  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  try {
    const { questionId, incrementView = false } = params;

    const question = await Question.findOneAndUpdate({ _id: questionId }, incrementView ? { $inc: { views: 1 } } : {}, {
      new: true,
      populate: [{ path: 'tags' }, { path: 'author', select: '_id name image' }],
    });

    if (!question) throw new Error('Question not found');

    return { success: true, data: JSON.parse(JSON.stringify(question)) };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}
