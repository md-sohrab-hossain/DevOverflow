'use server';

import { Answer } from '@/database';

import action from '../handlers/action';
import handleError from '../handlers/error';
import { GetAnswersSchema } from '../validations';

interface AnswerResponse {
  answers: Answer[];
  isNext: boolean;
  totalAnswers: number;
}

type SortOrder = 1 | -1;
type SortCriteria = Record<string, SortOrder>;

/**
 * Retrieves paginated and filtered answers for a specific question.
 * @param params - Parameters for filtering and pagination.
 * @returns Promise with answers, pagination info, and total count.
 */
export async function getAnswers(params: GetAnswersParams): Promise<ActionResponse<AnswerResponse>> {
  const validationResult = await validateParams(params);
  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  try {
    const { questionId, page = 1, pageSize = 10, filter } = params;
    const paginationOptions = getPaginationOptions(page, pageSize);
    const sortCriteria = getSortCriteria(filter);

    const [answers, totalAnswers] = await Promise.all([
      fetchAnswers(questionId, paginationOptions, sortCriteria),
      Answer.countDocuments({ question: questionId }),
    ]);

    const isNext = hasNextPage(totalAnswers, paginationOptions.skip, answers.length);

    return {
      success: true,
      data: {
        answers: JSON.parse(JSON.stringify(answers)),
        isNext,
        totalAnswers,
      },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}

/**
 * Validates the input parameters using the GetAnswersSchema.
 * @param params - Parameters to validate.
 * @returns Validation result or error.
 */
async function validateParams(params: GetAnswersParams) {
  return action({
    params,
    schema: GetAnswersSchema,
  });
}

/**
 * Calculates pagination options based on page and pageSize.
 * @param page - Current page number.
 * @param pageSize - Number of items per page.
 * @returns Pagination options.
 */
function getPaginationOptions(page: number, pageSize: number) {
  return {
    skip: (page - 1) * pageSize,
    limit: pageSize,
  };
}

/**
 * Determines the sort criteria based on the filter type.
 * @param filter - Filter type.
 * @returns Sort criteria.
 */
function getSortCriteria(filter?: string): SortCriteria {
  const sortOptions: Record<string, SortCriteria> = {
    latest: { createdAt: -1 as SortOrder },
    oldest: { createdAt: 1 as SortOrder },
    popular: { upvotes: -1 as SortOrder },
    default: { createdAt: -1 as SortOrder },
  };

  return sortOptions[filter as keyof typeof sortOptions] || sortOptions.default;
}

/**
 * Fetches answers from the database with pagination and sorting.
 * @param questionId - ID of the question.
 * @param pagination - Pagination options.
 * @param sortCriteria - Sort criteria.
 * @returns Fetched answers.
 */
async function fetchAnswers(
  questionId: string,
  pagination: { skip: number; limit: number },
  sortCriteria: SortCriteria
) {
  return Answer.find({ question: questionId })
    .populate('author', '_id name image')
    .sort(sortCriteria)
    .skip(pagination.skip)
    .limit(pagination.limit);
}

/**
 * Determines if there are more pages of results available.
 * @param totalItems - Total number of items.
 * @param skip - Number of items to skip.
 * @param currentPageSize - Number of items on the current page.
 * @returns True if there are more pages, otherwise false.
 */
function hasNextPage(totalItems: number, skip: number, currentPageSize: number): boolean {
  return totalItems > skip + currentPageSize;
}
