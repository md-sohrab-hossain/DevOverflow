import Link from 'next/link';

import { auth } from '@/auth';
import LocalSearch from '@/components/search/LocalSearch';
import { Button } from '@/components/ui/button';
import ROUTES from '@/constants/routes';

const questions = [
  {
    _id: '1',
    title: 'How to learn React?',
    description: 'I want to learn React, can anyone help me?',
    tags: [
      { _id: '1', name: 'React' },
      { _id: '2', name: 'JavaScript' },
    ],
    author: { _id: '1', name: 'John Doe' },
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
      { _id: '1', name: 'React' },
      { _id: '2', name: 'JavaScript' },
    ],
    author: { _id: '1', name: 'John Doe' },
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
  const session = await auth();
  console.log(session);

  const { query = '' } = await searchParams;

  const filteredQuestions = questions.filter(question => question.title.toLowerCase().includes(query?.toLowerCase()));

  return (
    <>
      <section className="flex flex-col-reverse justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="h1-bold text-dark100_light900">All Questions</h1>
        <Button className="primary-gradient min-h-[46px] px-4 py-3 !text-light-900" asChild>
          <Link href={ROUTES.ASK_QUESTION}>Ask a question</Link>
        </Button>
      </section>

      <section className="mt-11">
        <LocalSearch imgSrc="./icons/search.svg" placeholder="Search Questions..." className="flex-1" route="/" />
      </section>

      {/* <section className="mt-1">Filters</section> */}
      <div className="mt-10 flex w-full flex-col gap-6">
        {filteredQuestions.map(question => (
          <h1 key={question._id}>{question.title}</h1>
        ))}
      </div>
    </>
  );
};

export default Home;
