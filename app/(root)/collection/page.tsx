/**
 * Collections Page Component
 *
 * This page displays a list of questions saved by the authenticated user.
 * It includes:
 * - A search bar for filtering saved questions
 * - Pagination support
 * - Various sorting options
 * - A responsive grid of question cards
 */

import QuestionCard from '@/components/cards/QuestionCards';
import DataRenderer from '@/components/DataRenderer';
import LocalSearch from '@/components/search/LocalSearch';
import ROUTES from '@/constants/routes';
import { EMPTY_QUESTION } from '@/constants/states';
import { getSavedQuestions } from '@/lib/actions/collection.action';

interface SearchParams {
  searchParams: Promise<{ [key: string]: string }>;
}

const Collections = async ({ searchParams }: SearchParams) => {
  // Extract and validate search parameters
  const { page, pageSize, query, filter } = await searchParams;

  // Fetch saved questions with pagination and filtering
  const { success, data, error } = await getSavedQuestions({
    page: Number(page) || 1,
    pageSize: Number(pageSize) || 10,
    query: query || '',
    filter: filter || '',
  });

  const { collection } = data || {};

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4">
        <h1 className="h1-bold text-dark100_light900">Saved Questions</h1>
        <p className="paragraph-regular text-dark400_light800">View and manage all your saved questions in one place</p>
      </div>

      {/* Search Bar */}
      <div className="mt-11 flex justify-between gap-5 max-sm:flex-col sm:items-center">
        <LocalSearch
          route={ROUTES.COLLECTION}
          imgSrc="/icons/search.svg"
          placeholder="Search questions..."
          otherClasses="flex-1"
        />
      </div>

      {/* Questions List */}
      <DataRenderer
        success={success}
        error={error}
        data={collection}
        empty={EMPTY_QUESTION}
        render={collection => (
          <div className="mt-10 flex w-full flex-col gap-6">
            {collection.map(item => (
              <QuestionCard key={item._id} question={item.question} />
            ))}
          </div>
        )}
      />
    </div>
  );
};

export default Collections;
