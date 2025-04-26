'use server';

/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                                                                             │
 * │  COLLECTION ACTION MODULE                                                   │
 * │                                                                             │
 * │  Purpose:                                                                   │
 * │  This module implements a comprehensive question management system that     │
 * │  allows users to save, retrieve, and manage their bookmarked questions.     │
 * │  It combines bookmarking functionality with efficient data retrieval using  │
 * │  MongoDB's aggregation pipeline.                                            │
 * │                                                                             │
 * │  Key Features:                                                              │
 * │  1. Question Bookmarking:                                                   │
 * │     - toggleSaveQuestion: Toggle save/unsave state of questions             │
 * │     - hasSavedQuestion: Check if a question is saved by current user        │
 * │     - Automatic handling of existing bookmarks                              │
 * │                                                                             │
 * │  2. Saved Questions Retrieval:                                              │
 * │     - getSavedQuestions: Retrieve paginated list of saved questions         │
 * │     - Supports multiple sorting options (recent, oldest, votes, answers)    │
 * │     - Implements efficient MongoDB aggregation pipeline                     │
 * │     - Handles complex data relationships (questions, tags, authors)         │
 * │                                                                             │
 * │  3. Security & Validation:                                                  │
 * │     - Ensures only authenticated users can access saved questions           │
 * │     - Validates question existence before saving                            │
 * │     - Handles all error cases gracefully                                    │
 * │                                                                             │
 * │  4. Data Management:                                                        │
 * │     - Creates/removes collection entries in the database                    │
 * │     - Maintains one-to-one relationship between user and question           │
 * │     - Revalidates question page after changes                               │
 * │     - Supports pagination and flexible filtering                            │
 * │                                                                             │
 * │  Database Queries Explained:                                                │
 * │  1. Finding Saved Questions:                                                │
 * │     Collection.find({ author: userId })                                     │
 * │     - Finds all questions saved by a specific user                          │
 * │     - userId: The ID of the authenticated user                              │
 * │                                                                             │
 * │  2. Search Functionality:                                                   │
 * │     $or: [                                                                  │
 * │       { title: { $regex: /searchTerm/i } },                                 │
 * │       { content: { $regex: /searchTerm/i } }                                │
 * │     ]                                                                       │
 * │     - Searches for questions where title OR content matches the search term │
 * │     - i flag makes the search case-insensitive                              │
 * │                                                                             │
 * │  3. Sorting Options:                                                        │
 * │     - { createdAt: -1 }: Sort by newest first                               │
 * │     - { createdAt: 1 }: Sort by oldest first                                │
 * │     - { upvotes: -1 }: Sort by most upvoted first                           │
 * │     - { answers: -1 }: Sort by most answered first                          │
 * │                                                                             │
 * │  4. Pagination:                                                             │
 * │     .skip((page - 1) * pageSize)                                            │
 * │     .limit(pageSize)                                                        │
 * │     - skip: Number of documents to skip (for pagination)                    │
 * │     - limit: Maximum number of documents to return                          │
 * │                                                                             │
 * │  5. Data Population:                                                        │
 * │     .populate({                                                             │
 * │       path: 'question',                                                     │
 * │       populate: [                                                           │
 * │         { path: 'tags', select: '_id name' },                               │
 * │         { path: 'author', select: '_id name image' }                        │
 * │       ]                                                                     │
 * │     })                                                                      │
 * │     - Fetches related data (questions, tags, authors) in a single query     │
 * │     - select: Specifies which fields to include in the result               │
 * │                                                                             │
 * │  Usage Examples:                                                            │
 * │  1. Saving a Question:                                                      │
 * │     await toggleSaveQuestion({ questionId: '123' })                         │
 * │                                                                             │
 * │  2. Checking Saved Status:                                                  │
 * │     const isSaved = await hasSavedQuestion({ questionId: '123' })           │
 * │                                                                             │
 * │  3. Retrieving Saved Questions:                                             │
 * │     const result = await getSavedQuestions({                                │
 * │       page: 1,                                                              │
 * │       filter: 'mostrecent'                                                  │
 * │     })                                                                      │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

import { FilterQuery, SortOrder } from 'mongoose';
import { revalidatePath } from 'next/cache';

import ROUTES from '@/constants/routes';
import { Collection, Question } from '@/database';

import action from '../handlers/action';
import handleError from '../handlers/error';
import { CollectionBaseSchema, PaginatedSearchParamsSchema } from '../validations';

/**
 * Validates the input parameters and user session
 * @param params - Collection base parameters
 * @returns Validated parameters and user ID or ErrorResponse
 */
async function validateInput(params: CollectionBaseParams) {
  const validationResult = await action({
    params,
    schema: CollectionBaseSchema,
    authorize: true,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  return {
    questionId: validationResult.params!.questionId,
    userId: validationResult.session?.user?.id,
  };
}

/**
 * Checks if a question exists in the database
 * @param questionId - ID of the question to check
 * @throws Error if question is not found
 */
async function validateQuestionExists(questionId: string) {
  const question = await Question.findById(questionId);
  if (!question) {
    throw new Error('Question not found');
  }
}

/**
 * Removes a question from user's collection
 * @param collectionId - ID of the collection to remove
 * @returns Response indicating the question was unsaved
 */
async function removeFromCollection(collectionId: string) {
  await Collection.findByIdAndDelete(collectionId);
  return {
    success: true,
    data: { saved: false },
  };
}

/**
 * Adds a question to user's collection
 * @param questionId - ID of the question to save
 * @param userId - ID of the user saving the question
 * @returns Response indicating the question was saved
 */
async function addToCollection(questionId: string, userId: string) {
  await Collection.create({
    question: questionId,
    author: userId,
  });

  revalidatePath(ROUTES.QUESTION(questionId));

  return {
    success: true,
    data: { saved: true },
  };
}

/**
 * Checks if a question is saved in the user's collection
 * @param params - Collection base parameters containing questionId
 * @returns ActionResponse indicating whether the question is saved
 */
export async function hasSavedQuestion(params: CollectionBaseParams): Promise<ActionResponse<{ saved: boolean }>> {
  try {
    // Validate input and get user context
    const validationResult = await validateInput(params);

    if (validationResult instanceof Error) {
      return handleError(validationResult) as ErrorResponse;
    }

    const { questionId, userId } = validationResult as { questionId: string; userId: string | undefined };

    if (!userId) {
      return handleError(new Error('User not authenticated')) as ErrorResponse;
    }

    // Check if question exists in collection
    const collection = await Collection.findOne({
      question: questionId,
      author: userId,
    });

    return {
      success: true,
      data: {
        saved: !!collection,
      },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}

/**
 * Toggles the save state of a question in user's collection
 * If the question is already saved, it will be removed from the collection
 * If the question is not saved, it will be added to the collection
 *
 * @param params - Collection base parameters containing questionId
 * @returns ActionResponse indicating success/failure and save state
 */
export async function toggleSaveQuestion(params: CollectionBaseParams): Promise<ActionResponse<{ saved: boolean }>> {
  try {
    // Validate input and get user context
    const validationResult = await validateInput(params);

    // Check if validation failed
    if ('error' in validationResult) {
      return validationResult;
    }

    const { questionId, userId } = validationResult as { questionId: string; userId: string | undefined };

    if (!userId) {
      return handleError(new Error('User not authenticated')) as ErrorResponse;
    }

    // Ensure question exists
    await validateQuestionExists(questionId);

    // Check if question is already in collection
    const existingCollection = await Collection.findOne({
      question: questionId,
      author: userId,
    });

    // Toggle save state
    if (existingCollection) {
      return await removeFromCollection(existingCollection.id);
    }

    return await addToCollection(questionId, userId);
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}

/**
 * Retrieves saved questions for the current user with pagination and filtering
 * using MongoDB's aggregation pipeline for efficient data retrieval.
 *
 * @param params - Paginated search parameters including:
 *   - page: Current page number (default: 1)
 *   - pageSize: Number of items per page (default: 10)
 *   - query: Search term for filtering questions
 *   - filter: Sorting criteria (mostrecent, oldest, mostvoted, mostanswered)
 *
 * @returns ActionResponse containing:
 *   - collection: Array of saved questions with populated related data
 *   - isNext: Boolean indicating if there are more results
 *
 * @example
 * // Get first page of most recent saved questions
 * const result = await getSavedQuestions({ page: 1, filter: 'mostrecent' });
 */
export async function getSavedQuestions(
  params: PaginatedSearchParams
): Promise<ActionResponse<{ collection: Collection[]; isNext: boolean }>> {
  try {
    // Validate input and get user context
    const validationResult = await action({
      params,
      schema: PaginatedSearchParamsSchema,
      authorize: true,
    });

    if (validationResult instanceof Error) {
      return handleError(validationResult) as ErrorResponse;
    }

    const userId = validationResult.session?.user?.id;
    if (!userId) {
      return handleError(new Error('User not authenticated')) as ErrorResponse;
    }

    const { page = 1, pageSize = 10, query, filter } = params;
    const skip = (Number(page) - 1) * pageSize;
    const limit = Number(pageSize);

    // Build filter query with user context
    const filterQuery: FilterQuery<typeof Collection> = { author: userId };

    // Add search query if provided (case-insensitive search)
    if (query) {
      // First, find all collections for the user
      const collections = await Collection.find({ author: userId }).populate({
        path: 'question',
        populate: {
          path: 'tags',
          select: 'name',
        },
      });

      // Filter collections based on search query
      const filteredCollections = collections.filter(collection => {
        const question = collection.question;
        if (!question) return false;

        const searchLower = query.toLowerCase();
        const titleMatch = question.title?.toLowerCase().includes(searchLower);
        const contentMatch = question.content?.toLowerCase().includes(searchLower);
        const tagMatch = question.tags?.some((tag: { name: string }) => tag.name.toLowerCase().includes(searchLower));

        return titleMatch || contentMatch || tagMatch;
      });

      // Get IDs of matching collections
      const matchingIds = filteredCollections.map(c => c._id);

      // Update filter query to only include matching collections
      filterQuery._id = { $in: matchingIds };
    }

    // Determine sort criteria based on filter
    const sortCriteria = getSortCriteria(filter);

    // Execute parallel queries for count and data retrieval
    const [totalQuestions, questions] = await Promise.all([
      Collection.countDocuments(filterQuery),
      Collection.find(filterQuery)
        .populate({
          path: 'question',
          populate: [
            { path: 'tags', select: '_id name' },
            { path: 'author', select: '_id name image' },
          ],
        })
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit),
    ]);

    // Calculate if there are more results
    const isNext = totalQuestions > skip + questions.length;

    return {
      success: true,
      data: {
        collection: JSON.parse(JSON.stringify(questions)),
        isNext,
      },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}

/**
 * Determines the sort criteria based on the filter parameter.
 * Implements various sorting options for saved questions:
 * - mostrecent: Sort by creation date (newest first)
 * - oldest: Sort by creation date (oldest first)
 * - mostvoted: Sort by number of upvotes
 * - mostanswered: Sort by number of answers
 *
 * @param filter - The filter type to determine sort order
 * @returns Object containing MongoDB sort criteria
 */
function getSortCriteria(filter?: string): { [key: string]: SortOrder } {
  switch (filter) {
    case 'mostrecent':
      return { createdAt: -1 };
    case 'oldest':
      return { createdAt: 1 };
    case 'mostvoted':
      return { upvotes: -1 };
    case 'mostanswered':
      return { answers: -1 };
    default:
      return { createdAt: -1 };
  }
}
