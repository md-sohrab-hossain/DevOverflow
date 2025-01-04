'use client';

import { usePathname } from 'next/navigation';
import React from 'react';

import { sidebarLinks } from '@/constants';
import { resolveRoute, isRouteActive } from '@/lib/utils';

import NavLinkItem from './NavLinkItem';

interface NavLinksProps {
  isMobileNav?: boolean;
  userId?: string | undefined;
}

const NavLinks = ({ isMobileNav = false, userId }: NavLinksProps) => {
  const pathname = usePathname();

  return (
    <>
      {sidebarLinks.map((item, index) => {
        const route = resolveRoute(item.route, userId);
        if (!route) return null;

        const isActive = isRouteActive(pathname, route);

        return (
          <NavLinkItem
            key={`${route}-${index}`}
            id={userId}
            item={item}
            isActive={isActive}
            isMobileNav={isMobileNav}
          />
        );
      })}
    </>
  );
};

export default NavLinks;
