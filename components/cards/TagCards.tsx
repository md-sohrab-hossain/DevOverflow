import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import ROUTES from '@/constants/routes';
import { cn, getDevIconClassName, getTechDescription } from '@/lib/utils';

import { Badge } from '../ui/badge';

interface TagCardProps {
  _id: string;
  name: string;
  questions?: number;
  showCount?: boolean;
  compact?: boolean;
  remove?: boolean;
  isButton?: boolean;
  handleRemove?: () => void;
}

const TagIcon = ({ name, size = 'sm' }: { name: string; size?: 'sm' | '2xl' }) => {
  const iconClass = getDevIconClassName(name);
  return <i className={cn(iconClass, size === 'sm' ? 'text-sm' : 'text-2xl')} aria-hidden="true" />;
};

const RemoveButton = ({ onClick }: { onClick?: () => void }) => (
  <Image
    src="/icons/close.svg"
    width={12}
    height={12}
    alt="close icon"
    className="cursor-pointer object-contain invert-0 dark:invert"
    onClick={onClick}
  />
);

const CompactTagBadge = ({ name, remove, handleRemove }: Pick<TagCardProps, 'name' | 'remove' | 'handleRemove'>) => (
  <Badge className="subtle-medium background-light800_dark300 text-light400_light500 flex flex-row gap-2 rounded-md border-none px-4 py-2 uppercase">
    <div className="flex-center space-x-2">
      <TagIcon name={name} />
      <span>{name}</span>
    </div>
    {remove && <RemoveButton onClick={handleRemove} />}
  </Badge>
);

const QuestionCount = ({ count }: { count?: number }) =>
  count !== undefined && <p className="small-medium text-dark500_light700">{count}</p>;

const CompactView = ({ _id, name, questions, showCount, remove, isButton, handleRemove }: TagCardProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const content = (
    <>
      <CompactTagBadge name={name} remove={remove} handleRemove={handleRemove} />
      {showCount && <QuestionCount count={questions} />}
    </>
  );

  const containerClassName = 'flex justify-between gap-2';

  if (isButton) {
    return (
      <button onClick={handleClick} className={containerClassName}>
        {content}
      </button>
    );
  }

  return (
    <Link href={ROUTES.TAG(_id)} className={containerClassName}>
      {content}
    </Link>
  );
};

const FullView = ({ _id, name, questions }: TagCardProps) => (
  <Link href={ROUTES.TAG(_id)} className="shadow-light100_darknone">
    <article className="background-light900_dark200 light-border flex w-full flex-col rounded-2xl border px-8 py-10 sm:w-[260px]">
      <div className="flex items-center justify-between gap-3">
        <div className="background-light800_dark400 w-fit rounded-sm px-5 py-1.5">
          <p className="paragraph-semibold text-dark300_light900">{name}</p>
        </div>
        <TagIcon name={name} size="2xl" />
      </div>

      <p className="small-regular text-dark500_light700 mt-5 line-clamp-3 w-full">{getTechDescription(name)}</p>

      <p className="small-medium text-dark400_light500 mt-3.5">
        <span className="body-semibold primary-text-gradient mr-2.5">{questions}+</span>
        Questions
      </p>
    </article>
  </Link>
);

const TagCard = ({
  _id,
  name,
  questions = 0,
  showCount = false,
  compact = false,
  remove = false,
  isButton = false,
  handleRemove,
}: TagCardProps) => {
  if (compact) {
    return (
      <CompactView
        _id={_id}
        name={name}
        questions={questions}
        showCount={showCount}
        remove={remove}
        isButton={isButton}
        handleRemove={handleRemove}
      />
    );
  }

  return <FullView _id={_id} name={name} questions={questions} />;
};

export default TagCard;
