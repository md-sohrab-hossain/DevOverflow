import { Avatar, AvatarFallback } from '@radix-ui/react-avatar';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

interface MetricProps {
  imgUrl: string;
  alt: string;
  value: string | number;
  title: string;
  href?: string;
  textStyles: string;
  imgStyles?: string;
  isAuthor?: boolean;
}

const MetricImage = ({ imgUrl, alt, imgStyles }: Pick<MetricProps, 'imgUrl' | 'alt' | 'imgStyles'>) => (
  <Image src={imgUrl} width={16} height={16} alt={alt} className={`rounded-full object-contain ${imgStyles}`} />
);

const MetricAvatar = ({ value }: { value: string | number }) => {
  const getInitials = (name: string): string =>
    name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <Avatar>
      <AvatarFallback
        className="primary-gradient size-3 rounded-full p-[2px] font-space-grotesk text-[9px] font-bold tracking-wider text-white"
        aria-label={`${value}'s initials`}
      >
        {typeof value === 'string' && getInitials(value)}
      </AvatarFallback>
    </Avatar>
  );
};

const MetricText = ({
  value,
  title,
  textStyles,
  isAuthor = false,
}: Pick<MetricProps, 'value' | 'title' | 'textStyles' | 'isAuthor'>) => (
  <p className={`${textStyles} flex items-center gap-1`}>
    {value}
    <span className={`small-regular line-clamp-1 ${isAuthor ? 'max-sm:hidden' : ''}`}>{title}</span>
  </p>
);

const MetricContent = ({ imgUrl, alt, value, title, textStyles, imgStyles, isAuthor }: Omit<MetricProps, 'href'>) => (
  <>
    {imgUrl ? <MetricImage imgUrl={imgUrl} alt={alt} imgStyles={imgStyles} /> : <MetricAvatar value={value} />}
    <MetricText value={value} title={title} textStyles={textStyles} isAuthor={isAuthor} />
  </>
);

const Metric = ({ imgUrl, alt, value, title, href, textStyles, imgStyles, isAuthor }: MetricProps) => {
  const content = (
    <MetricContent
      imgUrl={imgUrl}
      alt={alt}
      value={value}
      title={title}
      textStyles={textStyles}
      imgStyles={imgStyles}
      isAuthor={isAuthor}
    />
  );

  if (href) {
    return (
      <Link href={href} className="flex-center gap-1">
        {content}
      </Link>
    );
  }

  return <div className="flex-center gap-1">{content}</div>;
};

export default Metric;
