import React from 'react';

import { auth } from '@/auth';

import AuthButtons from './navbar/AuthButton';
import NavLinks from './navbar/NavLinks';

const LeftSidebar = async () => {
  const session = await auth();
  const userId = session?.user?.id;

  return (
    <section className="custom-scrollbar background-light900_dark200 light-border sticky left-0 top-0 flex h-screen flex-col justify-between overflow-y-auto border-r p-6 pt-36 shadow-light-300 dark:shadow-none max-sm:hidden lg:w-[266px]">
      <div className="flex flex-1 flex-col gap-6">
        <NavLinks userId={userId} />
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <AuthButtons userId={userId} />
      </div>
    </section>
  );
};

export default LeftSidebar;
