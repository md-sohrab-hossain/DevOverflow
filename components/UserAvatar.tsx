import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import ROUTES from '@/constants/routes';
import { cn } from '@/lib/utils';

import { Avatar, AvatarFallback } from './ui/avatar';

interface UserAvatarProps {
  id: string;
  name: string;
  imageUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
  linkDisabled?: boolean;
}

const DEFAULT_AVATAR_SIZE = 36;

const getInitials = (fullName: string): string => {
  return fullName
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const UserAvatar: React.FC<UserAvatarProps> = ({
  id,
  name,
  imageUrl,
  className = 'h-9 w-9',
  fallbackClassName = '',
  linkDisabled = false,
}) => {
  const renderAvatar = () => (
    <Avatar className={className}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={`${name}'s avatar`}
          className="object-cover"
          width={DEFAULT_AVATAR_SIZE}
          height={DEFAULT_AVATAR_SIZE}
          quality={100}
          priority={false}
        />
      ) : (
        <AvatarFallback
          className={cn('primary-gradient font-space-grotesk font-bold tracking-wider text-white', fallbackClassName)}
          aria-label={`${name}'s initials`}
        >
          {getInitials(name)}
        </AvatarFallback>
      )}
    </Avatar>
  );

  if (linkDisabled) {
    return renderAvatar();
  }

  return (
    <Link href={`${ROUTES.PROFILE(id)}}`} aria-label={`View ${name}'s profile`}>
      {renderAvatar()}
    </Link>
  );
};

export default UserAvatar;
