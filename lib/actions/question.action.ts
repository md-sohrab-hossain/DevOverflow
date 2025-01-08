'use server';

import mongoose from 'mongoose';
import { z } from 'zod';

import Question from '@/database/question.model';
import TagQuestion from '@/database/tag-question.model';
import Tag from '@/database/tag.model';

import action from '../handlers/action';
import handleError from '../handlers/error';
import { AskQuestionSchema } from '../validations';

async function validateSchema<T>(params: T) {
  return await action({
    params,
    schema: AskQuestionSchema as z.ZodSchema,
    authorize: true,
  });
}

// Creates a new question document in the database.
async function createQuestionDocument(title: string, content: string, userId: string, session: mongoose.ClientSession) {
  const [question] = await Question.create([{ title, content, author: userId }], { session });

  if (!question) throw new Error('Question creation failed');
  return question;
}

// Processes a single tag:
// - If the tag exists, increments the 'questions' count.
// - If the tag doesn't exist, creates a new tag document.
async function processTag(tag: string, session: mongoose.ClientSession) {
  return Tag.findOneAndUpdate(
    { name: { $regex: new RegExp(`^${tag}$`, 'i') } },
    { $setOnInsert: { name: tag }, $inc: { questions: 1 } },
    { upsert: true, new: true, session }
  );
}

// Creates relationships between the question and its associated tags.
// 1. Processes each tag using `processTag` to get the corresponding tag documents.
// 2. Extracts the IDs of the processed tag documents.
// 3. Creates `TagQuestion` documents to link each tag with the question.
async function createTagRelations(
  tags: string[],
  questionId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession
) {
  const tagResults = await Promise.all(tags.map(tag => processTag(tag, session)));
  const tagIds = tagResults.map(tag => tag._id);

  await TagQuestion.insertMany(
    tagIds.map(tagId => ({
      tag: tagId,
      question: questionId,
    })),
    { session }
  );

  return tagIds;
}

// Updates the question document to include the IDs of the related tags.
async function updateQuestionTags(
  questionId: mongoose.Types.ObjectId,
  tagIds: mongoose.Types.ObjectId[],
  session: mongoose.ClientSession
) {
  await Question.findByIdAndUpdate(questionId, { $push: { tags: { $each: tagIds } } }, { session });
}

// Creates a new question.
export async function createQuestion(params: CreateQuestionParams): Promise<ActionResponse | ActionResponse<Question>> {
  const validationResult = await validateSchema(params);
  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { title, content, tags } = validationResult.params!;
  const userId = validationResult?.session?.user?.id;
  if (!userId) throw new Error('User not authenticated');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const question = await createQuestionDocument(title, content, userId, session);
    const tagIds = await createTagRelations(tags, question._id, session);
    await updateQuestionTags(question._id, tagIds, session);

    await session.commitTransaction();
    return { success: true, data: JSON.parse(JSON.stringify(question)) };
  } catch (error) {
    await session.abortTransaction();
    return handleError(error) as ActionResponse;
  } finally {
    session.endSession();
  }
}
