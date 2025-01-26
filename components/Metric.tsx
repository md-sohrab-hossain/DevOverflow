import { Avatar, AvatarFallback } from '@radix-ui/react-avatar';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import { cn } from '@/lib/utils';

interface MetricProps {
  imgUrl?: string;
  alt?: string;
  value: string | number;
  title?: string;
  href?: string;
  textStyles?: string;
  imgStyles?: string;
  isAuthor?: boolean;
  titleStyles?: string;
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const Metric: React.FC<MetricProps> = ({
  imgUrl,
  alt = '',
  value,
  title,
  href,
  textStyles = '',
  imgStyles = '',
  isAuthor = false,
  titleStyles = '',
}) => {
  const renderAvatar = () => (
    <Avatar className="translate-y-[-2px]">
      <AvatarFallback
        className="primary-gradient size-3 rounded-full p-[2px] font-space-grotesk text-[9px] font-bold tracking-wider text-white"
        aria-label={`${value}'s initials`}
      >
        {typeof value === 'string' && getInitials(value)}
      </AvatarFallback>
    </Avatar>
  );

  const renderImage = () => (
    <Image src={imgUrl!} width={16} height={16} alt={alt} className={`rounded-full object-contain ${imgStyles}`} />
  );

  const renderContent = () => (
    <>
      {imgUrl ? renderImage() : renderAvatar()}
      <p className={`${textStyles} flex items-center gap-1`}>
        {value}
        {title && (
          <span className={cn(`small-regular line-clamp-1 ${isAuthor ? 'max-sm:hidden' : ''}`, titleStyles)}>
            {title}
          </span>
        )}
      </p>
    </>
  );

  const content = renderContent();

  return href ? (
    <Link href={href} className="flex-center gap-1">
      {content}
    </Link>
  ) : (
    <div className="flex-center gap-1">{content}</div>
  );
};

export default Metric;
