'use client';

import { usePathname } from 'next/navigation';
import React from 'react';

import { sidebarLinks } from '@/constants';

import NavLinkItem from './NavLinkItem';

const NavLinks = ({ isMobileNav = false }: { isMobileNav?: boolean }) => {
  const pathname = usePathname();
  const userId = '1'; // This could be fetched dynamically

  return (
    <>
      {sidebarLinks.map(item => {
        // Resolve dynamic routes
        let resolvedRoute: string | ((id: string) => string) = item.route;
        if (typeof resolvedRoute === 'function') {
          resolvedRoute = resolvedRoute(userId.toString());
        }

        const isActive = (pathname.includes(resolvedRoute) && resolvedRoute.length > 1) || pathname === resolvedRoute;

        return (
          <NavLinkItem
            id={userId}
            key={resolvedRoute}
            item={{ ...item, route: resolvedRoute }}
            isActive={isActive}
            isMobileNav={isMobileNav}
          />
        );
      })}
    </>
  );
};

export default NavLinks;
