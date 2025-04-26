'use server';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { FilterQuery, SortOrder } from 'mongoose';
import { ZodSchema } from 'zod';

import { Question, Tag } from '@/database';

import action from '../handlers/action';
import handleError from '../handlers/error';
import { PaginatedSearchParamsSchema } from '../validations';

type FilterConditions = {
  filterQuery: FilterQuery<typeof Question>;
  sortCriteria: { [key: string]: SortOrder };
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
  try {
    const validationResult = await validateGetAllQuestions(params);

    if (validationResult instanceof Error) {
      return handleError(validationResult) as ErrorResponse;
    }

    // Handle the 'recommended' filter case
    if (params.filter === 'recommended') {
      return {
        success: true,
        data: { questions: [], isNext: false },
      };
    }

    const { page = 1, pageSize = 10, query: searchTerm, filter } = params;
    const { skip, limit } = calculatePaginationParams(page, pageSize);

    const searchQuery = await buildSearchQuery(searchTerm);
    const { filterQuery, sortCriteria } = await getFilterConditions(filter);

    // Combine search and filter queries
    const finalQuery = { ...searchQuery, ...filterQuery };

    // Execute database queries in parallel
    const [totalQuestions, questions] = await Promise.all([
      Question.countDocuments(finalQuery),
      fetchQuestionsFromDB(finalQuery, sortCriteria, skip, limit),
    ]);

    const isNext = hasMorePages(totalQuestions, skip, questions.length);

    return {
      success: true,
      data: {
        questions: JSON.parse(JSON.stringify(questions)),
        isNext,
      },
    };
  } catch (error) {
    console.error('Error in getAllQuestions:', error);
    return {
      success: true,
      data: {
        questions: [],
        isNext: false,
      },
    };
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
  const defaultSort = { createdAt: -1 as SortOrder };

  const findTagByName = async (name: string) => {
    try {
      return await Tag.findOne({
        name: { $regex: new RegExp(name, 'i') },
      });
    } catch (error) {
      return handleError(error, 'api');
    }
  };

  const getDefaultFilterConditions = (sortCriteria: { [key: string]: SortOrder }) => ({
    filterQuery: {},
    sortCriteria,
  });

  const predefinedFilters: Record<string, FilterConditions> = {
    newest: getDefaultFilterConditions({ createdAt: -1 as SortOrder }),
    unanswered: {
      filterQuery: { answers: 0 },
      sortCriteria: { createdAt: -1 as SortOrder },
    },
    popular: getDefaultFilterConditions({ upvotes: -1 as SortOrder }),
  };

  // Handle predefined filters
  if (filterType && predefinedFilters[filterType]) {
    return predefinedFilters[filterType];
  }

  // Handle tag-based filtering
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
  sortCriteria: { [key: string]: SortOrder },
  skip: number,
  limit: number
) {
  try {
    // First check if there are any matching questions
    const count = await Question.countDocuments(query);

    if (count === 0) {
      return [];
    }

    return Question.find(query)
      .populate('tags', 'name')
      .populate('author', 'name image')
      .lean()
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
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
