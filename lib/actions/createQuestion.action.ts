'use server';

import mongoose from 'mongoose';
import { z } from 'zod';

import Question from '@/database/question.model';
import TagQuestion from '@/database/tag-question.model';
import Tag from '@/database/tag.model';

import action from '../handlers/action';
import handleError from '../handlers/error';
import { AskQuestionSchema } from '../validations';

/**
 * Main function to create a new question with associated tags
 * @param params - Contains the question details (title, content, tags)
 * @returns Promise containing either success response with question data or error response
 *
 * The function follows these main steps:
 * 1. Validates the input parameters
 * 2. Creates the question document
 * 3. Creates/updates tags and their relationships with the question
 * 4. All operations are wrapped in a transaction for data consistency
 */
export async function createQuestion(params: CreateQuestionParams): Promise<ActionResponse | ActionResponse<Question>> {
  // First, validate all input parameters against the schema
  const validationResult = await validateSchema(params);
  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  // Extract validated data and user ID from the validation result
  const { title, content, tags } = validationResult.params!;
  const userId = validationResult?.session?.user?.id;
  if (!userId) throw new Error('User not authenticated');

  // Start a MongoDB session for transaction management
  // This ensures all database operations either complete together or fail together
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Step 1: Create the main question document
    const question = await createQuestionDocument(title, content, userId, session);

    // Step 2: Process tags and create relationships
    const tagIds = await createTagRelations(tags, question._id, session);

    // Step 3: Update the question document with the tag references
    await updateQuestionTags(question._id, tagIds, session);

    // If all operations succeed, commit the transaction
    await session.commitTransaction();

    // Return success response with the created question data
    return { success: true, data: JSON.parse(JSON.stringify(question)) };
  } catch (error) {
    // If any operation fails, roll back all changes
    await session.abortTransaction();
    return handleError(error) as ActionResponse;
  } finally {
    // Always close the session, whether the transaction succeeded or failed
    session.endSession();
  }
}

/**
 * Validates the input parameters against the defined schema
 * @param params - The parameters to validate
 * @returns Validation result with either success data or error
 */
async function validateSchema<T>(params: T) {
  return await action({
    params,
    schema: AskQuestionSchema as z.ZodSchema,
    authorize: true, // Ensures the user is authenticated
  });
}

/**
 * Creates a new question document in the database
 * @param title - Question title
 * @param content - Question content/body
 * @param userId - ID of the user creating the question
 * @param session - MongoDB session for transaction management
 * @returns Created question document
 */
async function createQuestionDocument(title: string, content: string, userId: string, session: mongoose.ClientSession) {
  // Create array with single question to maintain consistency with MongoDB operations
  const [question] = await Question.create([{ title, content, author: userId }], { session });

  if (!question) throw new Error('Question creation failed');
  return question;
}

/**
 * Manages the creation of relationships between the question and its tags
 * @param tags - Array of tag names
 * @param questionId - ID of the created question
 * @param session - MongoDB session for transaction management
 * @returns Array of created/updated tag IDs
 *
 * This function:
 * 1. Processes each tag (creates new or updates existing)
 * 2. Creates the many-to-many relationships between tags and the question
 */
async function createTagRelations(
  tags: string[],
  questionId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession
) {
  // Process all tags in parallel and get their documents
  const tagResults = await Promise.all(tags.map(tag => processTag(tag, session)));
  // Extract just the IDs from the tag documents
  const tagIds = tagResults.map(tag => tag._id);

  // Create the relationships between tags and the question
  await TagQuestion.insertMany(
    tagIds.map(tagId => ({
      tag: tagId,
      question: questionId,
    })),
    { session }
  );

  return tagIds;
}

/**
 * Processes a single tag - either creates new or updates existing
 * @param tag - Tag name to process
 * @param session - MongoDB session for transaction management
 * @returns Tag document (either new or updated)
 *
 * Key features:
 * - Case-insensitive tag matching using regex
 * - Automatically increments the questions count for the tag
 * - Creates new tag if it doesn't exist (upsert operation)
 */
async function processTag(tag: string, session: mongoose.ClientSession) {
  return Tag.findOneAndUpdate(
    { name: { $regex: new RegExp(`^${tag}$`, 'i') } }, // Case-insensitive search
    {
      $setOnInsert: { name: tag }, // Only set name if creating new tag
      $inc: { questions: 1 }, // Increment questions count
    },
    { upsert: true, new: true, session } // Create if doesn't exist, return updated doc
  );
}

/**
 * Updates the question document with references to its tags
 * @param questionId - ID of the question to update
 * @param tagIds - Array of tag IDs to add to the question
 * @param session - MongoDB session for transaction management
 *
 * Uses $push with $each to add multiple tag references in a single operation
 */
async function updateQuestionTags(
  questionId: mongoose.Types.ObjectId,
  tagIds: mongoose.Types.ObjectId[],
  session: mongoose.ClientSession
) {
  await Question.findByIdAndUpdate(questionId, { $push: { tags: { $each: tagIds } } }, { session });
}

// 1. $push:
//    - `$push` is an update operator used in MongoDB to add elements to an array field (in this case, the `tags` array).
//    - In this query, the `tags` field of the `Question` document will have new elements (tag IDs) added to it.

// 2. $each:
//    - `$each` is used with `$push` to allow multiple elements to be pushed into the array in a single operation.
//    - This means instead of adding each tag ID one by one in multiple operations, the query adds all the tag IDs from `tagIds` in one go.
//    - The `tagIds` array is passed to `$each`, which contains multiple tag IDs.

// 3. { session }:
//    - This is used to pass the `session` object to the update operation.
//    - A session is typically used when you want to execute the operation as part of a MongoDB transaction. Using a session ensures that the operation is atomic and can be rolled back if there's an error.

// ### Example:

// Suppose you have the following setup:
// - A `Question` document with `_id = "question123"` has a `tags` field, which is initially an empty array.
// - You have an array of `tagIds = ["tag1", "tag2", "tag3"]` that you want to add to the `tags` array of this question.

// Before the operation, the `Question` document might look like this:

// ```json
// {
//   "_id": "question123",
//   "tags": []  // Initially empty tags array
// }
// ```

// Now, you call the `updateQuestionTags` function with the following parameters:
// ```javascript
// updateQuestionTags(
//   mongoose.Types.ObjectId("question123"), // questionId
//   [
//     mongoose.Types.ObjectId("tag1"),  // First tag ID
//     mongoose.Types.ObjectId("tag2"),  // Second tag ID
//     mongoose.Types.ObjectId("tag3")   // Third tag ID
//   ],
//   session  // MongoDB session (for transaction management)
// );
// ```

// ### What happens during this update?

// - The `findByIdAndUpdate` method will locate the document with `_id = "question123"`.
// - The `$push` operation will add the tag IDs `"tag1"`, `"tag2"`, and `"tag3"` to the `tags` array.
// - Since we are using `$each`, all three tag IDs will be pushed to the `tags` array in one operation.

// After the operation, the `Question` document will be updated as follows:

// ```json
// {
//   "_id": "question123",
//   "tags": [
//     "tag1",  // Added tag 1
//     "tag2",  // Added tag 2
//     "tag3"   // Added tag 3
//   ]
// }
// ```

// ### Example with Transaction:

// If this operation is part of a larger transaction (using the `session`), the update will be wrapped inside the transaction. This ensures that if there are any errors with the transaction (e.g., in other operations within the same transaction), the entire operation (including the `updateQuestionTags` operation) can be rolled back, maintaining consistency.

// ### Key Points:
// - $push: Adds items to an array field (`tags` in this case).
// - $each: Allows adding multiple items to the array in a single operation.
// - session: Ensures that the operation is part of a transaction, providing atomicity.
