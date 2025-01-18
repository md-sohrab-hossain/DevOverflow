import { FilterQuery, SortOrder } from 'mongoose';
import { ZodSchema } from 'zod';

import { Tag } from '@/database';

import action from '../handlers/action';
import handleError from '../handlers/error';
import { PaginatedSearchParamsSchema } from '../validations';

// Types
type SortOption = 'popular' | 'recent' | 'oldest' | 'name';
type SortCriteria = { [key: string]: SortOrder };

interface SearchParams {
  page?: number;
  pageSize?: number;
  query?: string;
  filter?: SortOption;
}

// Helper methods
const getSortOrder = (filter?: SortOption): SortCriteria => {
  // Define how documents should be sorted based on filter option
  // -1 means descending order (high to low)
  // 1 means ascending order (low to high)
  const sortOrders: Record<SortOption, SortCriteria> = {
    popular: { questions: -1 as SortOrder }, // Most questions first
    recent: { createdAt: -1 as SortOrder }, // Newest first
    oldest: { createdAt: 1 as SortOrder }, // Oldest first
    name: { name: 1 as SortOrder }, // Alphabetical A-Z
  };

  return sortOrders[filter ?? 'popular'];
};

const getSearchQuery = (query?: string): FilterQuery<typeof Tag> => {
  // If search query exists, create a MongoDB regex search
  // $regex: query -> Matches pattern in the string
  // $options: 'i' -> Case insensitive search
  // Example: if query is "java", it will match "Java", "JAVA", "javascript", etc.
  return query ? { name: { $regex: query, $options: 'i' } } : {};
};

const getPagination = (page: number = 1, pageSize: number = 10) => {
  // MongoDB pagination using skip and limit
  // skip: how many documents to skip
  // limit: maximum number of documents to return
  // Example: For page 2 with pageSize 10:
  // skip = (2-1) * 10 = 10 (skips first 10 documents)
  // limit = 10 (returns maximum 10 documents)
  return {
    skip: (Number(page) - 1) * Number(pageSize),
    limit: Number(pageSize),
  };
};

// Main function
export const getTags = async (params: SearchParams) => {
  const validationResult = await action({
    params,
    schema: PaginatedSearchParamsSchema as ZodSchema,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult);
  }

  try {
    const { page, pageSize, query, filter } = params;
    const { skip, limit } = getPagination(page, pageSize);
    const filterQuery = getSearchQuery(query);
    const sortBy = getSortOrder(filter);

    // Promise.all executes both queries concurrently for better performance
    const [totalTags, tags] = await Promise.all([
      // countDocuments: Counts total matching documents for pagination
      Tag.countDocuments(filterQuery),

      // find(): Retrieves documents matching the filter
      // .sort(): Orders the results based on sortBy criteria
      // .skip(): Skips documents for pagination
      // .limit(): Restricts number of returned documents
      Tag.find(filterQuery).sort(sortBy).skip(skip).limit(limit),
    ]);

    // Calculate if there are more pages
    // If total documents > (current page * page size), more pages exist
    const isNext = totalTags > skip + tags.length;

    // JSON.parse(JSON.stringify()) is used to convert Mongoose documents
    // to plain JavaScript objects, removing any Mongoose-specific properties
    return {
      success: true,
      data: {
        tags: JSON.parse(JSON.stringify(tags)),
        isNext,
      },
    };
  } catch (error) {
    return handleError(error);
  }
};
