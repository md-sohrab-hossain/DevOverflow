'use server';

import mongoose from 'mongoose';
import { ZodSchema } from 'zod';

import Question, { IQuestion } from '@/database/question.model';
import TagQuestion from '@/database/tag-question.model';
import Tag, { ITagDoc } from '@/database/tag.model';

import action from '../handlers/action';
import handleError from '../handlers/error';
import { EditQuestionSchema } from '../validations';

/**
 * Main function to update an existing question and its tags
 *
 * This function handles the entire update process:
 * 1. Validates the input data (title, content, tags)
 * 2. Checks if user is authorized to edit the question
 * 3. Updates the question content if changed
 * 4. Manages tags (adds new ones, removes old ones)
 *
 * Uses database transactions to ensure all-or-nothing updates:
 * - If any part fails, all changes are rolled back
 * - If successful, all changes are saved together
 *
 * @param params - Object containing:
 *   - title: New title for the question
 *   - content: New content/body of the question
 *   - tags: Array of tag names
 *   - questionId: ID of the question to update
 *
 * @returns Object with:
 *   - success: true if update was successful
 *   - data: Updated question data
 *   - error: Error message if something went wrong
 *
 * Example:
 * await editQuestion({
 *   title: "Updated Title",
 *   content: "New content",
 *   tags: ["javascript", "react"],
 *   questionId: "123"
 * });
 */
export async function editQuestion(params: EditQuestionParams): Promise<ActionResponse<Question>> {
  // First, validate all input parameters
  const validationResult = await validateEditQuestion(params);
  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { title, content, tags, questionId } = validationResult.params!;
  const userId = validationResult?.session?.user?.id;

  // Start a database transaction
  // This ensures that all database operations either succeed together or fail together
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the question and include its tags
    const question = await Question.findById(questionId).populate('tags');
    if (!question) throw new Error('Question not found');
    if (question.author.toString() !== userId) throw new Error('Unauthorized');

    // Update the question's content
    await updateQuestionContent(question, title, content, session);
    // Handle tag changes (additions and removals)
    await processTagChanges(question, tags, questionId, session);

    // If everything succeeded, commit all changes
    await session.commitTransaction();
    return { success: true, data: JSON.parse(JSON.stringify(question)) };
  } catch (error) {
    // If anything failed, undo all changes
    await session.abortTransaction();
    return handleError(error) as ErrorResponse;
  } finally {
    // Always close the session
    session.endSession();
  }
}

/**
 * Validates the input data for editing a question
 *
 * Uses Zod schema to check:
 * - All required fields are present
 * - Data formats are correct
 * - User has permission to edit
 *
 * @param params - The input data to validate
 * @returns Validated data or error if validation fails
 */
async function validateEditQuestion<T>(params: T) {
  return await action({
    params,
    schema: EditQuestionSchema as ZodSchema,
    authorize: true,
  });
}

/**
 * Updates the basic content of a question (title and body)
 *
 * Only saves changes if the content is actually different
 * This prevents unnecessary database updates
 *
 * Example:
 * If old title: "Hello" and new title: "Hello"
 * → No update needed
 * If old title: "Hello" and new title: "Hello World"
 * → Update performed
 *
 * @param question - The question document to update
 * @param title - New title for the question
 * @param content - New content/body for the question
 * @param session - Database transaction session
 */
async function updateQuestionContent(
  question: mongoose.Document & IQuestion,
  title: string,
  content: string,
  session: mongoose.ClientSession
): Promise<void> {
  const hasChanges = question.title !== title || question.content !== content;

  if (hasChanges) {
    question.title = title;
    question.content = content;
    await question.save({ session });
  }
}

/**
 * Handles all tag-related changes for a question
 *
 * This function:
 * 1. Identifies which tags to add and remove
 * 2. Creates new tags if they don't exist
 * 3. Updates tag usage counts
 * 4. Maintains relationships between questions and tags
 *
 * Example:
 * Old tags: ["javascript", "react"]
 * New tags: ["javascript", "typescript"]
 * Result:
 * - "react" is removed
 * - "typescript" is added
 * - "javascript" remains unchanged
 *
 * Important notes:
 * - Tags are case-insensitive ("React" = "react")
 * - Tag counts are maintained (how many questions use each tag)
 * - All operations are part of the same transaction
 *
 * @param question - The question being updated
 * @param newTags - Array of new tag names
 * @param questionId - ID of the question
 * @param session - Database transaction session
 */
async function processTagChanges(
  question: mongoose.Document & IQuestion,
  newTags: string[],
  questionId: string,
  session: mongoose.ClientSession
): Promise<void> {
  // Convert tags to lowercase for case-insensitive comparison
  const normalizedNewTags = newTags.map(tag => tag.toLowerCase());

  // Get current tags from the populated question
  const currentTags = question.populated('tags') ? (question.tags as unknown as ITagDoc[]) : [];

  // Create lists of tags to add and remove
  const tagsToAdd = normalizedNewTags.filter(
    newTag => !currentTags.some(existingTag => existingTag.name.toLowerCase() === newTag)
  );

  const tagsToRemove = currentTags.filter(currentTag => !normalizedNewTags.includes(currentTag.name.toLowerCase()));

  // Store new tag-question relationships to be created
  const newTagDocuments: Array<{ tag: mongoose.Types.ObjectId; question: string }> = [];

  // Process tags that need to be added
  if (tagsToAdd.length > 0) {
    for (const tagName of tagsToAdd) {
      // Find existing tag or create new one (case-insensitive search)
      const existingTag = await Tag.findOneAndUpdate(
        { name: { $regex: new RegExp(`^${tagName}$`, 'i') } },
        {
          $setOnInsert: { name: tagName }, // Only set name if creating new tag
          $inc: { questions: 1 }, // Increment question count for the tag
        },
        { upsert: true, new: true, session }
      );

      if (existingTag) {
        // Prepare new tag-question relationship
        newTagDocuments.push({
          tag: existingTag._id,
          question: questionId,
        });
        // Add tag to question's tags array
        question.tags.push(existingTag._id);
      }
    }
  }

  // Process tags that need to be removed
  if (tagsToRemove.length > 0) {
    const tagIdsToRemove = tagsToRemove.map(tag => tag._id) as mongoose.Types.ObjectId[];

    // First, fetch the current tag counts
    const tagsToUpdate = await Tag.find({ _id: { $in: tagIdsToRemove } }, { _id: 1, questions: 1 }, { session });

    // Process each tag
    for (const tag of tagsToUpdate) {
      if (tag.questions === 0) {
        // If count is already 0, just delete the tag
        await Tag.findByIdAndDelete(tag._id, { session });
      } else if (tag.questions > 0) {
        // Decrement count if greater than 0
        await Tag.findByIdAndUpdate(tag._id, { $inc: { questions: -1 } }, { session });

        // If this decrement results in zero, delete the tag
        if (tag.questions === 1) {
          await Tag.findByIdAndDelete(tag._id, { session });
        }
      }
    }

    // Remove tag-question relationships
    await TagQuestion.deleteMany({ tag: { $in: tagIdsToRemove }, question: questionId }, { session });

    // Update the question document's tags array
    await Question.findByIdAndUpdate(questionId, { $pull: { tags: { $in: tagIdsToRemove } } }, { session });

    // Update the local question object's tags array
    question.tags = (question.tags as mongoose.Types.ObjectId[]).filter(
      tagId => !tagIdsToRemove.some(removeId => removeId.toString() === tagId.toString())
    );
  }

  // Create new tag-question relationships in bulk
  if (newTagDocuments.length > 0) {
    await TagQuestion.insertMany(newTagDocuments, { session });
  }

  // Save all changes to the question
  await question.save({ session });
}
