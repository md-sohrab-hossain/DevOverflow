import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import TagCard from '@/components/cards/TagCards';
import { Preview } from '@/components/editor/preview';
import Metric from '@/components/Metric';
import UserAvatar from '@/components/UserAvatar';
import ROUTES from '@/constants/routes';
import { getQuestion } from '@/lib/actions/getQuestion.action';
import { formatNumber, getTimeStamp } from '@/lib/utils';

const getCachedQuestion = cache(async (id: string) => {
  const cookieStore = cookies();
  const hasBeenViewed = (await cookieStore).get(id);

  const viewedCount = Number(hasBeenViewed?.value) || 1;
  return await getQuestion({
    questionId: id,
    incrementView: viewedCount === 1,
  });
});

const QuestionDetails = async ({ params }: RouteParams) => {
  const { id } = await params;

  // Use cached version which prevents multiple API calls on refresh
  const { success, data: question } = await getCachedQuestion(id);

  if (!success || !question) return redirect('/404');

  const { author, createdAt, answers, views, tags, content, title } = question;

  return (
    <>
      <QuestionHeader author={author} title={title} />
      <QuestionMetrics createdAt={createdAt} answers={answers} views={views} />
      <Preview content={content} />
      <QuestionTags tags={tags} />
    </>
  );
};

const QuestionHeader = ({ author, title }: { author: Author; title: string }) => (
  <div className="flex-start w-full flex-col">
    <div className="flex w-full flex-col-reverse justify-between">
      <div className="flex items-center justify-start gap-1">
        <UserAvatar
          id={author._id}
          name={author.name}
          imageUrl={author.image || ''}
          className="size-22"
          fallbackClassName="text-[10px]"
        />
        <Link href={ROUTES.PROFILE(author._id)}>
          <p className="paragraph-semibold text-dark-300_light700">{author.name}</p>
        </Link>
      </div>
      <div className="flex justify-end">
        <p>Votes</p>
      </div>
    </div>
    <h2 className="h2-semibold text-dark200_light900 mt-3.5 w-full">{title}</h2>
  </div>
);

const QuestionMetrics = ({ createdAt, answers, views }: { createdAt: Date; answers: number; views: number }) => (
  <div className="mb-8 mt-5 flex flex-wrap gap-4">
    <Metric
      imgUrl="/icons/clock.svg"
      alt="clock icon"
      value={` asked ${getTimeStamp(new Date(createdAt))}`}
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
    {tags.map((tag: Tag) => (
      <TagCard key={tag._id} _id={tag._id as string} name={tag.name} compact />
    ))}
  </div>
);

export default QuestionDetails;
