"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { ReactNode } from "react";

import SocialLogin from "@/components/socialLogin";
import ROUTES from "@/constants/routes";
import { toast } from "@/hooks/use-toast";

const AuthLayout = ({ children }: { children: ReactNode }) => {
  const handleSignIn = async (provider: "github" | "google") => {
    try {
      await signIn(provider, {
        redirectTo: ROUTES.HOME, // Where to redirect after successful login
        redirect: false, // Prevent automatic redirect
      });
    } catch (error) {
      toast({
        title: "Sign-in Failed",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred during sign-in",
        variant: "destructive",
      });
    }
  };

  return (
    <main className="flex h-screen items-center justify-center bg-auth-light bg-cover bg-center bg-no-repeat px-10 py-12 dark:bg-auth-dark">
      <section className="light-border background-light800_dark200 shadow-light100_dark100 min-w-full rounded-[10px] border px-4 py-10 shadow-md sm:min-w-[520px] sm:px-8">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-2.5">
            <h1 className="h2-bold text-dark-100_light900">Join DevFlow</h1>
            <p className="paragraph-regular text-dark500_light400">
              To get your questions answered
            </p>
          </div>

          <Image
            src="/images/site-logo.svg"
            alt="DevFlow Logo"
            width={50}
            height={50}
            draggable={false}
            className="object-contain"
          />
        </div>
        {children}
        <SocialLogin onLogin={handleSignIn} />
      </section>
    </main>
  );
};

export default AuthLayout;
