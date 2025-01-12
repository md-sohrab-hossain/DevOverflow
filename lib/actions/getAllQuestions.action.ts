/* eslint-disable @typescript-eslint/no-explicit-any */
import { FilterQuery } from 'mongoose';
import { ZodSchema } from 'zod';

import { Question, Tag } from '@/database';

import action from '../handlers/action';
import handleError from '../handlers/error';
import { PaginatedSearchParamsSchema } from '../validations';

type FilterConditions = {
  filterQuery: FilterQuery<typeof Question>;
  sortCriteria: { [key: string]: number };
};

/**
 * Server action to retrieve a paginated list of questions with filtering and search
 *
 * @param params - Object containing search and pagination parameters
 * @param params.page - Current page number (default: 1)
 * @param params.pageSize - Number of questions per page (default: 10)
 * @param params.query - Optional search term to filter questions
 * @param params.filter - Optional filter type ('newest', 'unanswered', 'popular', 'recommended')
 *
 * @returns Promise containing:
 * - success: boolean indicating if the operation was successful
 * - data: object containing:
 *   - questions: array of Question objects
 *   - isNext: boolean indicating if there are more pages
 */
export async function getAllQuestions(
  params: PaginatedSearchParams
): Promise<ActionResponse<{ questions: Question[]; isNext: boolean }>> {
  const validationResult = await validateGetAllQuestions(params);

  // Return an error response if validation fails
  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  try {
    // Handle the 'recommended' filter case (currently returning empty array)
    if (params.filter === 'recommended') {
      return {
        success: true,
        data: { questions: [], isNext: false },
      };
    }

    // Extract parameters with default values
    const { page = 1, pageSize = 10, query: searchTerm, filter } = params;

    // Calculate pagination parameters (skip and limit)
    const { skip, limit } = calculatePaginationParams(page, pageSize);

    // Build the search query based on the search term
    const searchQuery = await buildSearchQuery(searchTerm);

    // Get filter and sort criteria based on the provided filter type
    const { filterQuery, sortCriteria } = await getFilterConditions(filter);

    // Combine the search and filter queries into a final query
    const finalQuery = { ...searchQuery, ...filterQuery };

    // Execute database queries in parallel: total count and actual data fetching
    const [totalQuestions, questions] = await Promise.all([
      Question.countDocuments(finalQuery),
      fetchQuestionsFromDB(finalQuery, sortCriteria, skip, limit),
    ]);

    // Determine if there are more pages of results
    const isNext = hasMorePages(totalQuestions, skip, questions.length);

    // Return the formatted response
    return {
      success: true,
      data: {
        questions: JSON.parse(JSON.stringify(questions)), // Remove MongoDB-specific fields
        isNext,
      },
    };
  } catch (error) {
    // Handle unexpected errors
    console.error('Error in getAllQuestions:', error);
    return handleError(error) as ErrorResponse;
  }
}

/**
 * Validates parameters for retrieving questions
 * @param params - Parameters to validate
 * @returns Validated parameters or Error
 */
async function validateGetAllQuestions<T>(params: T) {
  return await action({
    params,
    schema: PaginatedSearchParamsSchema as ZodSchema,
  });
}

/**
 * Calculates pagination parameters (skip and limit) based on page and pageSize
 * @param page - Current page number
 * @param pageSize - Number of items per page
 * @returns Object with skip and limit values
 */
function calculatePaginationParams(page: number = 1, pageSize: number = 10) {
  return {
    skip: (Number(page) - 1) * Number(pageSize),
    limit: Number(pageSize),
  };
}

/**
 * Builds a search query to search for questions by title, content, or tags
 * @param searchTerm - Optional search term
 * @returns MongoDB query object
 */
async function buildSearchQuery(searchTerm?: string) {
  if (!searchTerm) return {};

  const regex = new RegExp(searchTerm, 'i'); // Case-insensitive regex

  // First, find all tag IDs that match the search term
  const matchingTagIds = await Tag.find({ name: { $regex: regex } }).select('_id');
  const tagIds = matchingTagIds.map(tag => tag._id);

  return {
    $or: [
      { title: { $regex: regex } },
      { content: { $regex: regex } },
      { tags: { $in: tagIds } }, // Include questions that have any matching tags
    ],
  };
}

/**
 * Gets filter conditions and sorting criteria based on the filter type
 * If the filter type doesn't match predefined filters, checks if it matches a tag name
 * @param filterType - Type of filter to apply or tag name
 * @returns Promise of filter conditions
 */
async function getFilterConditions(filterType?: string): Promise<FilterConditions> {
  const defaultSort = { createdAt: -1 };

  const findTagByName = async (name: string) => {
    try {
      return await Tag.findOne({
        name: { $regex: new RegExp(name, 'i') },
      });
    } catch (error) {
      return handleError(error, 'api');
    }
  };

  const getDefaultFilterConditions = (sortCriteria: Record<string, number>) => ({
    filterQuery: {},
    sortCriteria,
  });

  const predefinedFilters: any = {
    newest: getDefaultFilterConditions(defaultSort),
    unanswered: getDefaultFilterConditions({ answers: 0 }),
    popular: getDefaultFilterConditions({ upvotes: -1 }),
  };

  if (predefinedFilters[filterType || '']) {
    return predefinedFilters[filterType || ''];
  }

  if (filterType) {
    const tag = await findTagByName(filterType);
    if (tag) {
      return {
        filterQuery: { tags: tag._id },
        sortCriteria: defaultSort,
      };
    }
  }

  // Default filter if no valid filter type found
  return getDefaultFilterConditions(defaultSort);
}

/**
 * Fetches questions from the database with the given query, sort criteria, and pagination
 * @param query - MongoDB query object
 * @param sortCriteria - Sorting criteria
 * @param skip - Number of documents to skip
 * @param limit - Number of documents to return
 * @returns Promise resolving to array of questions
 */
async function fetchQuestionsFromDB(
  query: FilterQuery<typeof Question>,
  sortCriteria: any,
  skip: number,
  limit: number
) {
  return Question.find(query)
    .populate('tags', 'name')
    .populate('author', 'name image')
    .lean()
    .sort(sortCriteria)
    .skip(skip)
    .limit(limit);
}

/**
 * Checks if there are more pages of results
 * @param totalItems - Total number of items matching the query
 * @param skip - Number of items skipped
 * @param currentItems - Number of items in current page
 * @returns Boolean indicating if more pages exist
 */
function hasMorePages(totalItems: number, skip: number, currentItems: number) {
  return totalItems > skip + currentItems;
}
