"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";

import { SheetClose } from "@/components/ui/sheet";
import { sidebarLinks } from "@/constants";
import { cn } from "@/lib/utils";

const NavLinkItem = ({
  item,
  isActive,
  isMobileNav,
}: {
  isActive: boolean;
  isMobileNav: boolean;
  item: (typeof sidebarLinks)[0];
}) => {
  const linkComponent = (
    <Link
      href={item.route}
      key={item.label}
      className={cn(
        isActive
          ? "primary-gradient rounded-lg text-light-900"
          : "text-dark300_light900",
        "flex items-center justify-start gap-4 bg-transparent p-4"
      )}
    >
      <Image
        src={item.imgURL}
        alt={item.label}
        width={20}
        height={20}
        className={cn({ "invert-colors": !isActive })}
      />
      <p
        className={cn(
          isActive ? "base-bold" : "base-medium",
          !isMobileNav && "max-lg:hidden"
        )}
      >
        {item.label}
      </p>
    </Link>
  );

  return isMobileNav ? (
    <SheetClose asChild key={item.route}>
      {linkComponent}
    </SheetClose>
  ) : (
    <React.Fragment key={item.route}>{linkComponent}</React.Fragment>
  );
};

export default NavLinkItem;
