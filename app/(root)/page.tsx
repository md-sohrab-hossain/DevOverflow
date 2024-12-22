import Link from 'next/link';

import QuestionCards from '@/components/cards/QuestionCards';
import HomeFilter from '@/components/filters/HomeFilter';
import LocalSearch from '@/components/search/LocalSearch';
import { Button } from '@/components/ui/button';
import ROUTES from '@/constants/routes';
import dbConnect from '@/lib/mongoose';

const questions = [
  {
    _id: '1',
    title: 'How to learn React?',
    description: 'I want to learn React, can anyone help me?',
    tags: [
      { _id: '1', name: 'React' },
      { _id: '2', name: 'Javascript' },
    ],
    author: { _id: '1', name: 'John Doe', image: 'https://cdn-icons-png.flaticon.com/512/6858/6858504.png' },
    upvotes: 10,
    answers: 5,
    views: 100,
    createdAt: new Date(),
  },
  {
    _id: '2',
    title: 'How to learn JavaScript?',
    description: 'I want to learn JavaScript, can anyone help me?',
    tags: [
      { _id: '1', name: 'JavaScript' },
      { _id: '2', name: 'React' },
    ],
    author: { _id: '1', name: 'John Doe', image: 'https://cdn-icons-png.flaticon.com/512/6858/6858504.png' },
    upvotes: 10,
    answers: 5,
    views: 100,
    createdAt: new Date(),
  },
];

interface ISearchParams {
  searchParams: Promise<{ [key: string]: string }>; // Example: query='react'
}

const Home = async ({ searchParams }: ISearchParams) => {
  await dbConnect();

  const { query = '', filter = '' } = await searchParams;

  const filteredQuestions = questions.filter(question => {
    const matchesQuery = question.title.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter ? question.tags[0].name.toLowerCase() === filter.toLowerCase() : true;
    return matchesQuery && matchesFilter;
  });

  return (
    <>
      <section className="flex flex-col-reverse justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="h1-bold text-dark100_light900">All Questions</h1>
        <Button className="primary-gradient min-h-[46px] px-4 py-3 !text-light-900" asChild>
          <Link href={ROUTES.ASK_QUESTION}>Ask a question</Link>
        </Button>
      </section>

      <section className="mt-11">
        <LocalSearch
          placeholder="Search Questions..."
          imgSrc="./icons/search.svg"
          className="flex-1"
          route={ROUTES.HOME}
        />
      </section>

      <HomeFilter />

      <div className="mt-10 flex w-full flex-col gap-6">
        {filteredQuestions.map(question => (
          <QuestionCards key={question._id} questions={question} />
        ))}
      </div>
    </>
  );
};

export default Home;
