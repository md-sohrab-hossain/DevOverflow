import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import { Avatar, AvatarFallback } from './ui/avatar';

interface UserAvatarProps {
  id: string;
  name: string;
  className?: string;
  linkDisabled?: boolean;
  imageUrl?: string | null;
}

const DEFAULT_SIZE = 36;

const UserAvatar = ({ id, name, imageUrl, className = 'h-9 w-9', linkDisabled = false }: UserAvatarProps) => {
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const avatarContent = (
    <Avatar className={className}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={`${name}'s avatar`}
          className="object-cover"
          width={DEFAULT_SIZE}
          height={DEFAULT_SIZE}
          quality={100}
          priority={false}
        />
      ) : (
        <AvatarFallback
          className="primary-gradient font-space-grotesk font-bold tracking-wider text-white"
          aria-label={`${name}'s initials`}
        >
          {getInitials(name)}
        </AvatarFallback>
      )}
    </Avatar>
  );

  if (linkDisabled) {
    return avatarContent;
  }

  return (
    <Link href={`/profile/${id}`} aria-label={`View ${name}'s profile`}>
      {avatarContent}
    </Link>
  );
};

export default UserAvatar;
