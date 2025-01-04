import { LogOut } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { auth, signOut } from '@/auth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import ROUTES from '@/constants/routes';

import NavLinks from './NavLinks';

const MobileNavigation = async () => {
  const session = await auth();
  const userId = session?.user?.id;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Image src="/icons/hamburger.svg" width={36} height={36} alt="Menu" className="invert-colors sm:hidden" />
      </SheetTrigger>
      <SheetContent side="left" className="background-light900_dark200 border-none">
        <SheetTitle className="hidden">Navigation</SheetTitle>
        <Header />
        <MainNavigation userId={userId} />
      </SheetContent>
    </Sheet>
  );
};

const Header = () => (
  <Link href="/" className="flex items-center gap-1">
    <Image src="/images/site-logo.svg" width={23} height={23} alt="DevFlow Logo" />
    <p className="h2-bold font-space-grotesk text-dark-100 dark:text-light-900">
      Dev<span className="text-primary-500">Flow</span>
    </p>
  </Link>
);

const MainNavigation = ({ userId }: { userId: string | undefined }) => (
  <div className="no-scrollbar flex h-[calc(100vh-80px)] flex-col justify-between overflow-y-auto">
    <SheetClose asChild>
      <section className="flex h-full flex-col gap-3 pt-16">
        <NavLinks isMobileNav userId={userId} />
      </section>
    </SheetClose>

    <Footer userId={userId} />
  </div>
);

const Footer = ({ userId }: { userId: string | undefined }) => (
  <div className="flex flex-col gap-3">
    {userId ? (
      <LogoutButton />
    ) : (
      <>
        <SheetClose asChild>
          <Link href={ROUTES.SIGN_IN}>
            <Button className="small-medium btn-secondary min-h-[41px] w-full rounded-lg px-4 py-3 shadow-none">
              <span className="primary-text-gradient">Log In</span>
            </Button>
          </Link>
        </SheetClose>

        <SheetClose asChild>
          <Link href={ROUTES.SIGN_UP}>
            <Button className="small-medium light-border-2 btn-tertiary text-dark400_light900 min-h-[41px] w-full rounded-lg border px-4 py-3 shadow-none">
              Sign Up
            </Button>
          </Link>
        </SheetClose>
      </>
    )}
  </div>
);

const LogoutButton = () => (
  <SheetClose asChild>
    <form
      action={async () => {
        'use server';

        await signOut();
      }}
    >
      <Button type="submit" className="base-medium w-fit border-none !bg-transparent px-4 py-3 shadow-none">
        <LogOut className="size-5 text-black dark:text-white" />
        <span className="text-dark300_light900">Logout</span>
      </Button>
    </form>
  </SheetClose>
);

export default MobileNavigation;
