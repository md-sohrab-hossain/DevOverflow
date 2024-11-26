"use client";

import { usePathname } from "next/navigation";
import React from "react";

import { sidebarLinks } from "@/constants";
import ROUTES from "@/constants/routes";

import NavLinkItem from "../navLinkItem";

const NavLinks = ({ isMobileNav = false }: { isMobileNav?: boolean }) => {
  const pathname = usePathname();
  const userId = 1; // This could be fetched dynamically

  return (
    <>
      {sidebarLinks.map((item) => {
        const isActive =
          (pathname.includes(item.route) && item.route.length > 1) ||
          pathname === item.route;

        if (item.route === ROUTES.PROFILE && userId) {
          item.route = `${item.route}/${userId}`;
        }

        return (
          <NavLinkItem
            key={item.route}
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
