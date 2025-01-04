'use client';

import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import { SheetClose } from '@/components/ui/sheet';
import { NavLink } from '@/constants';
import { cn, resolveRoute } from '@/lib/utils';

interface NavLinkItemProps {
  id: string | undefined;
  isActive: boolean;
  isMobileNav: boolean;
  item: NavLink;
}

const NavLinkItem = ({ id, item, isActive, isMobileNav }: NavLinkItemProps) => {
  const href = resolveRoute(item.route, id);

  const LinkContent = () => (
    <Link
      href={href}
      className={cn(
        'flex items-center justify-start gap-4 bg-transparent p-4',
        isActive ? 'primary-gradient rounded-lg text-light-900' : 'text-dark300_light900'
      )}
    >
      <Image src={item.imgURL} alt={item.label} width={20} height={20} className={cn({ 'invert-colors': !isActive })} />
      <p className={cn(isActive ? 'base-bold' : 'base-medium', !isMobileNav && 'max-lg:hidden')}>{item.label}</p>
    </Link>
  );

  return isMobileNav ? (
    <SheetClose asChild>
      <LinkContent />
    </SheetClose>
  ) : (
    <LinkContent />
  );
};

export default NavLinkItem;
