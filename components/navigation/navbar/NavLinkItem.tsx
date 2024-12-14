'use client';

import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import { SheetClose } from '@/components/ui/sheet';
import { sidebarLinks } from '@/constants';
import { cn } from '@/lib/utils';

const NavLinkItem = ({
  id,
  item,
  isActive,
  isMobileNav,
}: {
  id: string;
  isActive: boolean;
  isMobileNav: boolean;
  item: (typeof sidebarLinks)[0];
}) => {
  const resolvedRoute: string | ((id: string) => string) =
    typeof item.route === 'function' ? item.route(id) : item.route;

  const linkComponent = (
    <Link
      href={resolvedRoute}
      key={item.label}
      className={cn(
        isActive ? 'primary-gradient rounded-lg text-light-900' : 'text-dark300_light900',
        'flex items-center justify-start gap-4 bg-transparent p-4'
      )}
    >
      <Image src={item.imgURL} alt={item.label} width={20} height={20} className={cn({ 'invert-colors': !isActive })} />
      <p className={cn(isActive ? 'base-bold' : 'base-medium', !isMobileNav && 'max-lg:hidden')}>{item.label}</p>
    </Link>
  );

  return isMobileNav ? (
    <SheetClose asChild key={resolvedRoute}>
      {linkComponent}
    </SheetClose>
  ) : (
    <React.Fragment key={resolvedRoute}>{linkComponent}</React.Fragment>
  );
};

export default NavLinkItem;
