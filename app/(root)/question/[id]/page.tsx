/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                                                                             │
 * │  QUESTION DETAILS PAGE                                                      │
 * │                                                                             │
 * │  Purpose:                                                                   │
 * │  This page displays detailed information about a specific question,         │
 * │  including its content, author, metrics, answers, and interaction options.  │
 * │                                                                             │
 * │  Key Features:                                                              │
 * │  1. Question Display:                                                       │
 * │     - Question title and content                                            │
 * │     - Author information and metrics                                        │
 * │     - Tags and voting system                                                │
 * │                                                                             │
 * │  2. User Interaction:                                                       │
 * │     - Voting system (upvote/downvote)                                       │
 * │     - Question saving functionality                                         │
 * │     - Answer submission form                                                │
 * │                                                                             │
 * │  3. Content Management:                                                     │
 * │     - Displays all answers with pagination                                  │
 * │     - Shows question metrics (views, answers)                               │
 * │     - Handles loading states with Suspense                                  │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cache, Suspense } from 'react';

import AllAnswers from '@/components/answers/AllAnswers';
import TagCard from '@/components/cards/TagCards';
import { Preview } from '@/components/editor/preview';
import AnswerForm from '@/components/forms/AnswerForm';
import Metric from '@/components/Metric';
import SaveQuestion from '@/components/questions/SaveQuestion';
import UserAvatar from '@/components/UserAvatar';
import Votes from '@/components/votes/Votes';
import ROUTES from '@/constants/routes';
import { hasSavedQuestion } from '@/lib/actions/collection.action';
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

/**
 * Caches the question data to prevent unnecessary refetches
 * Also handles view count incrementing
 */
const getCachedQuestion = cache(async (id: string): Promise<ActionResponse<Question>> => {
  const cookieStore = cookies();
  const hasBeenViewed = (await cookieStore).get(id);
  const viewedCount = Number(hasBeenViewed?.value) || 0;

  return await getQuestion({
    questionId: id,
    incrementView: viewedCount === 1,
  });
});

/**
 * Main Question Details Page Component
 *
 * Fetches and displays all question-related data including:
 * - Question content and metadata
 * - Author information
 * - Voting status
 * - Saved status
 * - Answers
 *
 * @param {RouteParams} params - Route parameters containing question ID
 */
const QuestionDetails = async ({ params, searchParams }: RouteParams) => {
  const { id } = await params;
  const { page, pageSize, filter } = await searchParams;

  // Fetch question data
  const { success, data: question, error } = await getCachedQuestion(id);

  // Handle question not found
  if (!success || !question) {
    console.error('Failed to fetch question:', error?.message);
    return redirect('/404');
  }

  // Fetch answers for the question
  const {
    success: areAnswersLoaded,
    data: answersResult,
    error: answersError,
  } = await getAnswers({
    questionId: id,
    page: Number(page) || 1,
    pageSize: Number(pageSize) || 10,
    filter,
  });

  // Get voting status for the question
  const hasVotedPromise = hasVoted({
    targetId: question._id,
    targetType: 'question',
  }).catch(() => ({
    success: false,
    data: { hasUpvoted: false, hasDownvoted: false },
  }));

  // Destructure question data for easier access
  const { author, createdAt, answers, views, tags, content, title, upvotes, downvotes, _id } = question;

  return (
    <>
      {/* Question Header with author info and actions */}
      <QuestionHeader
        author={author}
        title={title}
        questionId={_id}
        upvotes={upvotes}
        downvotes={downvotes}
        hasVotedPromise={hasVotedPromise}
      />

      {/* Question Metrics (time, answers, views) */}
      <QuestionMetrics createdAt={createdAt} answers={answers} views={views} />

      {/* Question Content Preview */}
      <Preview content={content} />

      {/* Question Tags */}
      <QuestionTags tags={tags} />

      {/* Answers Section */}
      <ShowAnswers result={answersResult || null} isLoaded={areAnswersLoaded} isError={answersError || undefined} />

      {/* Answer Form Section */}
      <AnswerFormSection questionId={_id} questionTitle={title} questionContent={content} />
    </>
  );
};

/**
 * Question Header Component
 *
 * Displays the question's author information, title, and interaction buttons
 * (voting and saving)
 */
const QuestionHeader = ({ author, title, upvotes, downvotes, questionId, hasVotedPromise }: QuestionHeaderProps) => {
  // Get initial saved state for the question
  const hasSavedQuestionPromise = hasSavedQuestion({
    questionId,
  });

  return (
    <div className="flex-start w-full flex-col">
      <div className="flex w-full flex-col-reverse justify-between">
        {/* Author Information */}
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

        {/* Interaction Buttons */}
        <div className="flex items-center justify-end gap-4">
          {/* Voting Component */}
          <Suspense fallback={<div>Loading...</div>}>
            <Votes
              upvotes={upvotes}
              targetType="question"
              targetId={questionId}
              downvotes={downvotes}
              hasVotedPromise={hasVotedPromise}
            />
          </Suspense>

          {/* Save Question Component */}
          <Suspense fallback={<div>Loading...</div>}>
            <SaveQuestion questionId={questionId} initialSavedState={hasSavedQuestionPromise} />
          </Suspense>
        </div>
      </div>
      <h2 className="h2-semibold text-dark200_light900 mt-3.5 w-full">{title}</h2>
    </div>
  );
};

/**
 * Question Metrics Component
 *
 * Displays key metrics about the question:
 * - When it was asked
 * - Number of answers
 * - Number of views
 */
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

/**
 * Question Tags Component
 *
 * Displays all tags associated with the question
 */
const QuestionTags = ({ tags }: { tags: Tag[] }) => (
  <div className="mt-8 flex flex-wrap gap-2">
    {tags.map(tag => (
      <TagCard key={tag._id} _id={tag._id} name={tag.name} compact />
    ))}
  </div>
);

/**
 * Show Answers Component
 *
 * Displays all answers to the question with loading and error states
 */
const ShowAnswers: React.FC<ShowAnswersProps> = ({ result, isLoaded, isError }) => (
  <section className="my-5">
    <AllAnswers data={result?.answers} success={isLoaded} error={isError} totalAnswers={result?.totalAnswers || 0} />
  </section>
);

/**
 * Answer Form Section Component
 *
 * Provides a form for users to submit new answers
 */
const AnswerFormSection = ({ questionId, questionTitle, questionContent }: AnswerFormSectionProps) => (
  <section className="my-5">
    <AnswerForm questionId={questionId} questionTitle={questionTitle} questionContent={questionContent} />
  </section>
);

export default QuestionDetails;
