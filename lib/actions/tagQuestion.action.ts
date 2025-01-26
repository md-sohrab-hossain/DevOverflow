'use server';

import { FilterQuery, SortOrder } from 'mongoose';
import { ZodSchema } from 'zod';

import { Question, Tag } from '@/database';

import action from '../handlers/action';
import handleError from '../handlers/error';
import { GetTagQuestionsSchema } from '../validations';

// ==============================
// Type Definitions
// ==============================
type SortCriteria = { [key: string]: SortOrder };

interface GetTagQuestionsParams {
  tagId: string;
  page?: number;
  pageSize?: number;
  query?: string;
  filter?: string;
}

// ==============================
// Constants
// ==============================
const DEFAULT_SORT = 'recent';

const SORT_ORDERS: Record<string, SortCriteria> = {
  mostViews: { views: -1 },
  mostAnswers: { answers: -1 },
  mostUpvoted: { upvotes: -1 },
  recent: { createdAt: -1 },
  oldest: { createdAt: 1 },
} as const;

const QUESTION_POPULATE_CONFIG = [
  { path: 'author', select: 'name image' },
  { path: 'tags', select: 'name' },
];

const QUESTION_SELECT_FIELDS = '_id title views answers upvotes downvotes author createdAt';

// ==============================
// Helper Functions
// ==============================

/**
 * Determines the sort order based on the filter parameter
 * @param filter - Sort filter option
 * @returns MongoDB sort criteria
 */
const getSortOrder = (filter?: string): SortCriteria => {
  return SORT_ORDERS[filter ?? DEFAULT_SORT];
};

/**
 * Builds a MongoDB query to search questions by tag and optional title search
 * @example
 * Without search query:
 * getSearchQuery("tagId123")
 * Returns: { tags: { $in: ["tagId123"] } }
 *
 * With search query:
 * getSearchQuery("tagId123", "react")
 * Returns: { tags: { $in: ["tagId123"] }, title: { $regex: "react", $options: "i" } }
 */
const getSearchQuery = (tagId: string, query?: string): FilterQuery<typeof Question> => {
  // Create base query to find questions that have the specified tag
  // $in operator checks if tagId exists in the tags array of the question
  const baseQuery: FilterQuery<typeof Question> = {
    tags: { $in: [tagId] },
  };

  // If search query exists, add title search condition
  // $regex enables partial matching (e.g., "react" matches "React.js", "React Native")
  // $options: 'i' makes the search case-insensitive
  if (query) {
    baseQuery.title = { $regex: query, $options: 'i' };
  }

  return baseQuery;
};

/**
 * Calculates pagination parameters for MongoDB query
 * @example
 * getPagination(2, 10)
 * Returns: { skip: 10, limit: 10 } - Skips first 10 items and returns next 10
 * getPagination(3, 5)
 * Returns: { skip: 10, limit: 5 } - Skips first 10 items and returns next 5
 */
const getPagination = (page: number = 1, pageSize: number = 10) => {
  // For page 1: skip = 0, show first pageSize documents
  // For page 2: skip = pageSize, show next pageSize documents
  // For page 3: skip = pageSize * 2, and so on
  return {
    skip: (Number(page) - 1) * Number(pageSize),
    limit: Number(pageSize),
  };
};

/**
 * Executes a MongoDB query to find questions with specified criteria
 * Includes pagination, sorting, and population of related data
 *
 * @example Query execution order:
 * 1. find() - Filters questions by tag and title
 * 2. select() - Picks specific fields
 * 3. populate() - Loads related author and tags data
 * 4. sort() - Orders results
 * 5. skip() - Skips documents for pagination
 * 6. limit() - Limits number of returned documents
 */
const findQuestionsWithTag = async (
  filterQuery: FilterQuery<typeof Question>,
  sortBy: SortCriteria,
  skip: number,
  limit: number
) => {
  return (
    Question.find(filterQuery)
      // Select only necessary fields for performance
      // Reduces data transfer and processing time
      .select(QUESTION_SELECT_FIELDS)

      // Populate replaces IDs with actual data from related collections
      // Like JOIN in SQL but for MongoDB
      .populate(QUESTION_POPULATE_CONFIG)

      // Apply sorting (e.g., newest first, most viewed)
      .sort(sortBy)

      // Implement pagination
      .skip(skip) // Skip documents for current page
      .limit(limit)
  ); // Return only specified number of documents
};

// ==============================
// Main Function
// ==============================

export const getTagQuestions = async (
  params: GetTagQuestionsParams
): Promise<ActionResponse<{ tag: Tag; questions: Question[]; isNext: boolean }>> => {
  const validationResult = await action({
    params,
    schema: GetTagQuestionsSchema as ZodSchema,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  try {
    const { tagId, page, pageSize, query, filter } = params;
    const { skip, limit } = getPagination(page, pageSize);
    const filterQuery = getSearchQuery(tagId, query);
    const sortBy = getSortOrder(filter);

    // QUERY 1: Find the tag document by its ID
    // findById is a shorthand for findOne({ _id: tagId })
    const tag = await Tag.findById(tagId);
    if (!tag) {
      throw new Error('Tag not found');
    }

    // QUERY 2 & 3: Execute multiple queries simultaneously using Promise.all
    // This is more efficient than running queries sequentially
    const [totalQuestions, questions] = await Promise.all([
      // QUERY 2: Count total matching questions for pagination
      // Uses same filter as main query but only counts documents
      Question.countDocuments(filterQuery),

      // QUERY 3: Get paginated and formatted questions
      // This executes the complex query defined in findQuestionsWithTag
      findQuestionsWithTag(filterQuery, sortBy, skip, limit),
    ]);

    // Calculate if there are more pages to load
    // Example: if total = 25, current page = 2, limit = 10
    // skip = 10, questions.length = 10, so isNext = true (5 more items exist)
    const isNext = totalQuestions > skip + questions.length;

    // Convert Mongoose documents to plain JavaScript objects
    // This removes Mongoose-specific properties and methods
    // Makes the response safe for JSON serialization
    return {
      success: true,
      data: {
        tag: JSON.parse(JSON.stringify(tag)),
        questions: JSON.parse(JSON.stringify(questions)),
        isNext,
      },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
};
