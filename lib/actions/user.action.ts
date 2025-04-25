'use server';

import { FilterQuery, SortOrder } from 'mongoose';
import { z } from 'zod';

import { User } from '@/database';

import action from '../handlers/action';
import handleError from '../handlers/error';
import { PaginatedSearchParamsSchema } from '../validations';

// Types derived from Zod schema for type safety
type FilterType = z.infer<typeof PaginatedSearchParamsSchema>['filter'];
type PaginatedSearchParams = z.infer<typeof PaginatedSearchParamsSchema>;

interface GetUsersResponse {
  users: User[];
  isNext: boolean;
}

/**
 * Builds a MongoDB filter query for searching users
 * @param query - Search string to match against user name or email
 * @returns MongoDB filter query object
 *
 * Example:
 * If query is "john", the filter will match:
 * - Users with "john" in their name (case-insensitive)
 * - Users with "john" in their email (case-insensitive)
 */
function buildUserFilterQuery(query?: string): FilterQuery<typeof User> {
  // Initialize empty filter query
  const filterQuery: FilterQuery<typeof User> = {};

  // If search query is provided, add name and email search conditions
  if (query) {
    filterQuery.$or = [
      // Search in name field using case-insensitive regex
      { name: { $regex: query, $options: 'i' } },
      // Search in email field using case-insensitive regex
      { email: { $regex: query, $options: 'i' } },
    ];
  }

  return filterQuery;
}

/**
 * Determines the sort criteria based on the selected filter
 * @param filter - Type of sorting to apply ('newest', 'oldest', or 'popular')
 * @returns MongoDB sort criteria object
 *
 * Sort options:
 * - newest: Sort by createdAt in descending order (-1)
 * - oldest: Sort by createdAt in ascending order (1)
 * - popular: Sort by reputation in descending order (-1)
 */
function getSortCriteria(filter?: FilterType): Record<string, SortOrder> {
  switch (filter) {
    case 'newest':
      // Sort by creation date, newest first
      return { createdAt: -1 };
    case 'oldest':
      // Sort by creation date, oldest first
      return { createdAt: 1 };
    case 'popular':
      // Sort by reputation, highest first
      return { reputation: -1 };
    default:
      // Default to newest first
      return { createdAt: -1 };
  }
}

/**
 * Calculates pagination parameters for MongoDB queries
 * @param page - Current page number (1-based)
 * @param pageSize - Number of items per page
 * @returns Object containing skip and limit values for pagination
 *
 * Example:
 * For page 2 with 10 items per page:
 * - skip = (2-1) * 10 = 10 (skip first 10 items)
 * - limit = 10 (return next 10 items)
 */
function calculatePagination(page: number = 1, pageSize: number = 10) {
  // Calculate number of items to skip
  const skip = (Number(page) - 1) * pageSize;
  // Set maximum number of items to return
  const limit = pageSize;
  return { skip, limit };
}

/**
 * Fetches users with pagination, search, and filtering
 * @param params - Object containing pagination and search parameters
 * @returns Promise containing users and pagination info
 *
 * Process:
 * 1. Validate input parameters
 * 2. Build filter query for search
 * 3. Determine sort criteria
 * 4. Calculate pagination parameters
 * 5. Execute parallel queries for total count and user list
 * 6. Determine if there are more pages
 * 7. Return formatted response
 */
export async function getUsers(params: PaginatedSearchParams): Promise<ActionResponse<GetUsersResponse>> {
  // Validate input parameters against schema
  const validationResult = await action({
    params,
    schema: PaginatedSearchParamsSchema,
  });

  // Handle validation errors
  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  // Extract validated parameters
  const { page, pageSize, query, filter } = validationResult.params!;

  // Calculate pagination parameters
  const { skip, limit } = calculatePagination(page, pageSize);

  // Build search filter
  const filterQuery = buildUserFilterQuery(query);

  // Get sort criteria
  const sortCriteria = getSortCriteria(filter);

  try {
    // Execute parallel queries for better performance
    const [totalUsers, users] = await Promise.all([
      // Count total matching users
      User.countDocuments(filterQuery),
      // Get paginated and sorted user list
      User.find(filterQuery).sort(sortCriteria).skip(skip).limit(limit),
    ]);

    // Check if there are more pages
    const isNext = totalUsers > skip + users.length;

    return {
      success: true,
      data: {
        // Convert MongoDB documents to plain objects
        users: JSON.parse(JSON.stringify(users)),
        isNext,
      },
    };
  } catch (error) {
    // Handle any database errors
    return handleError(error) as ErrorResponse;
  }
}
