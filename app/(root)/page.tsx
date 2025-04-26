import Link from 'next/link';

import QuestionCard from '@/components/cards/QuestionCards';
import DataRenderer from '@/components/DataRenderer';
import CommonFilter from '@/components/filters/CommonFilter';
import HomeFilter from '@/components/filters/HomeFilter';
import LocalSearch from '@/components/search/LocalSearch';
import { Button } from '@/components/ui/button';
import { HomePageFilters } from '@/constants/filters';
import ROUTES from '@/constants/routes';
import { EMPTY_QUESTION } from '@/constants/states';
import { getAllQuestions } from '@/lib/actions/getAllQuestions.action';

const Header = ({ title }: { title: string }) => (
  <section className="flex w-full flex-col-reverse justify-between gap-4 sm:flex-row sm:items-center">
    <h1 className="h1-bold text-dark100_light900">{title}</h1>
    <Button className="primary-gradient min-h-[46px] px-4 py-3 !text-light-900" asChild>
      <Link href={ROUTES.ASK_QUESTION}>Ask a Question</Link>
    </Button>
  </section>
);

const SearchSection = () => (
  <section className="mt-11 flex justify-between gap-5 max-sm:flex-col sm:items-center">
    <LocalSearch route="/" imgSrc="/icons/search.svg" placeholder="Search questions..." className="flex-1" />

    <CommonFilter
      filters={HomePageFilters}
      otherClasses="min-h-[56px] sm:min-w-[170px]"
      containerClasses="hidden max-md:flex"
    />
  </section>
);

const QuestionList = ({ questions }: { questions: Question[] }) => (
  <div className="mt-10 flex w-full flex-col gap-6">
    {questions.map(question => (
      <QuestionCard key={question._id} question={question} />
    ))}
  </div>
);

const Home = async ({ searchParams }: RouteParams) => {
  // Extract and process search parameters
  const params = await searchParams;
  const queryParams = {
    page: Number(params.page) || 1,
    pageSize: Number(params.pageSize) || 10,
    query: params.query || '',
    filter: params.filter || '',
  };

  // Fetch questions data
  const { success, data, error } = await getAllQuestions(queryParams);
  const { questions } = data || {};

  return (
    <>
      <Header title="All Questions" />
      <SearchSection />
      <HomeFilter />

      <DataRenderer
        success={success}
        error={error}
        data={questions}
        empty={EMPTY_QUESTION}
        render={questions => <QuestionList questions={questions} />} // render prop pattern
      />
    </>
  );
};

export default Home;
