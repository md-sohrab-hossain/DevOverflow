'use server';

import { Answer } from '@/database';

import action from '../handlers/action';
import handleError from '../handlers/error';
import { GetAnswersSchema } from '../validations';

interface AnswerResponse {
  answers: (typeof Answer)[];
  isNext: boolean;
  totalAnswers: number;
}

type SortOrder = 1 | -1;
type SortCriteria = Record<string, SortOrder>;

/**
 * Retrieves paginated and filtered answers for a specific question
 * @param params - Parameters for filtering and pagination
 * @returns Promise with answers, pagination info, and total count
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
 * Validates the input parameters using the GetAnswersSchema
 */
async function validateParams(params: GetAnswersParams) {
  return action({
    params,
    schema: GetAnswersSchema,
  });
}

/**
 * Calculates pagination options based on page and pageSize
 */
function getPaginationOptions(page: number, pageSize: number) {
  return {
    skip: (page - 1) * pageSize,
    limit: pageSize,
  };
}

/**
 * Determines the sort criteria based on the filter type
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
 * Fetches answers from the database with pagination and sorting
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
 * Determines if there are more pages of results available
 */
function hasNextPage(totalItems: number, skip: number, currentPageSize: number): boolean {
  return totalItems > skip + currentPageSize;
}
