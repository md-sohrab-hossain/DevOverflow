import Link from 'next/link';

import ROUTES from '@/constants/routes';

import UserAvatar from '../UserAvatar';

interface UserCardProps {
  _id: string;
  name: string;
  image?: string;
  username: string;
}

const UserCard = ({ _id, name, image = '', username }: UserCardProps) => {
  const profileUrl = ROUTES.PROFILE(_id);

  return (
    <div className="shadow-light100_darknone w-full md:w-[180px]">
      <article className="background-light900_dark200 light-border flex w-full flex-col items-center justify-center rounded-2xl border p-8">
        <UserAvatar
          id={_id}
          name={name}
          imageUrl={image}
          className="size-[80px] rounded-full object-cover"
          fallbackClassName="text-3xl tracking-widest"
        />

        <Link href={profileUrl}>
          <div className="mt-4 text-center">
            <h3 className="h3-bold text-dark200_light900 line-clamp-1">{name}</h3>
            <p className="body-regular text-dark500_light500 mt-2">@{username}</p>
          </div>
        </Link>
      </article>
    </div>
  );
};

export default UserCard;
