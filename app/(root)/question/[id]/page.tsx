import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cache, Suspense } from 'react';

import AllAnswers from '@/components/answers/AllAnswers';
import TagCard from '@/components/cards/TagCards';
import { Preview } from '@/components/editor/preview';
import AnswerForm from '@/components/forms/AnswerForm';
import Metric from '@/components/Metric';
import UserAvatar from '@/components/UserAvatar';
import Votes from '@/components/votes/Votes';
import ROUTES from '@/constants/routes';
import { getAnswers } from '@/lib/actions/getAnswer.action';
import { getQuestion } from '@/lib/actions/getQuestion.action';
import { hasVoted } from '@/lib/actions/vote.action';
import { formatNumber, getTimeStamp } from '@/lib/utils';

interface QuestionHeaderProps {
  author: Author;
  title: string;
  upvotes: number;
  downvotes: number;
  questionId: string;
  hasVotedPromise: Promise<ActionResponse<HasVotedResponse>>;
}

interface QuestionMetricsProps {
  createdAt: Date;
  answers: number;
  views: number;
}

interface AnswerFormSectionProps {
  questionId: string;
  questionTitle: string;
  questionContent: string;
}

interface AnswersResult {
  answers: Answer[];
  totalAnswers: number;
}

interface ShowAnswersProps {
  result: AnswersResult | null;
  isLoaded: boolean;
  isError: ErrorResponse['error'] | undefined;
}

interface RouteParams {
  params: {
    id: string;
  };
}

const getCachedQuestion = cache(async (id: string): Promise<ActionResponse<Question>> => {
  const cookieStore = cookies();
  const hasBeenViewed = (await cookieStore).get(id);
  const viewedCount = Number(hasBeenViewed?.value) || 0;

  return await getQuestion({
    questionId: id,
    incrementView: viewedCount === 1,
  });
});

const QuestionDetails = async ({ params }: RouteParams) => {
  const { id } = await params;

  const { success, data: question, error } = await getCachedQuestion(id);

  if (!success || !question) {
    console.error('Failed to fetch question:', error?.message);
    return redirect('/404');
  }

  const {
    success: areAnswersLoaded,
    data: answersResult,
    error: answersError,
  } = (await getAnswers({
    questionId: id,
    page: 1,
    pageSize: 10,
    filter: 'latest',
  })) as ActionResponse<AnswersResult>;

  const hasVotedPromise = hasVoted({
    targetId: question._id,
    targetType: 'question',
  }).catch(() => ({
    success: false,
    data: { hasUpvoted: false, hasDownvoted: false },
  }));

  const { author, createdAt, answers, views, tags, content, title, upvotes, downvotes, _id } = question;

  return (
    <>
      <QuestionHeader
        author={author}
        title={title}
        questionId={_id}
        upvotes={upvotes}
        downvotes={downvotes}
        hasVotedPromise={hasVotedPromise}
      />
      <QuestionMetrics createdAt={createdAt} answers={answers} views={views} />
      <Preview content={content} />
      <QuestionTags tags={tags} />
      <ShowAnswers result={answersResult || null} isLoaded={areAnswersLoaded} isError={answersError || undefined} />
      <AnswerFormSection questionId={_id} questionTitle={title} questionContent={content} />
    </>
  );
};

const QuestionHeader = ({ author, title, upvotes, downvotes, questionId, hasVotedPromise }: QuestionHeaderProps) => (
  <div className="flex-start w-full flex-col">
    <div className="flex w-full flex-col-reverse justify-between">
      <div className="flex items-center justify-start gap-1">
        <UserAvatar
          id={author._id}
          name={author.name}
          imageUrl={author.image}
          className="size-22"
          fallbackClassName="text-[10px]"
        />
        <Link href={ROUTES.PROFILE(author._id)}>
          <p className="paragraph-semibold text-dark-300_light700">{author.name}</p>
        </Link>
      </div>
      <div className="flex justify-end">
        <Suspense fallback={<div>Loading...</div>}>
          <Votes
            upvotes={upvotes}
            targetType="question"
            targetId={questionId}
            downvotes={downvotes}
            hasVotedPromise={hasVotedPromise}
          />
        </Suspense>
      </div>
    </div>
    <h2 className="h2-semibold text-dark200_light900 mt-3.5 w-full">{title}</h2>
  </div>
);

const QuestionMetrics = ({ createdAt, answers, views }: QuestionMetricsProps) => (
  <div className="mb-8 mt-5 flex flex-wrap gap-4">
    <Metric
      imgUrl="/icons/clock.svg"
      alt="clock icon"
      value={`asked ${getTimeStamp(createdAt)}`}
      title=""
      textStyles="small-regular text-dark400_light700"
    />
    <Metric
      imgUrl="/icons/message.svg"
      alt="message icon"
      value={answers}
      title=""
      textStyles="small-regular text-dark400_light700"
    />
    <Metric
      imgUrl="/icons/eye.svg"
      alt="eye icon"
      value={formatNumber(views)}
      title=""
      textStyles="small-regular text-dark400_light700"
    />
  </div>
);

const QuestionTags = ({ tags }: { tags: Tag[] }) => (
  <div className="mt-8 flex flex-wrap gap-2">
    {tags.map(tag => (
      <TagCard key={tag._id} _id={tag._id} name={tag.name} compact />
    ))}
  </div>
);

const ShowAnswers: React.FC<ShowAnswersProps> = ({ result, isLoaded, isError }) => (
  <section className="my-5">
    <AllAnswers data={result?.answers} success={isLoaded} error={isError} totalAnswers={result?.totalAnswers || 0} />
  </section>
);

const AnswerFormSection = ({ questionId, questionTitle, questionContent }: AnswerFormSectionProps) => (
  <section className="my-5">
    <AnswerForm questionId={questionId} questionTitle={questionTitle} questionContent={questionContent} />
  </section>
);

export default QuestionDetails;
