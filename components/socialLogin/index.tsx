'use client';

import Image from 'next/image';
import { signIn } from 'next-auth/react';

import ROUTES from '@/constants/routes';
import { toast } from '@/hooks/use-toast';

import { Button } from '../ui/button';

interface SocialProvider {
  name: 'github' | 'google';
  icon: string;
  alt: string;
}

const providers: SocialProvider[] = [
  { name: 'github', icon: '/icons/github.svg', alt: 'Github Logo' },
  { name: 'google', icon: '/icons/google.svg', alt: 'Google Logo' },
];

const SocialLogin = () => {
  const handleSignIn = async (provider: 'github' | 'google') => {
    try {
      await signIn(provider, {
        redirectTo: ROUTES.HOME, // Where to redirect after successful login
        redirect: false, // Prevent automatic redirect
      });
    } catch (error) {
      toast({
        title: 'Sign-in Failed',
        description: error instanceof Error ? error.message : 'An error occurred during sign-in',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="mt-10 flex flex-wrap gap-2.5">
      {providers.map(provider => (
        <Button
          key={provider.name}
          className="background-dark400_light900 body-medium text-dark200_light800 min-h-12 flex-1 rounded-2 px-4 py-3.5"
          onClick={() => handleSignIn(provider.name)}
        >
          <Image
            width={20}
            height={20}
            alt={provider.alt}
            src={provider.icon}
            className="invert-colors mr-2.5 object-contain"
          />
          <span>Login with {provider.name}</span>
        </Button>
      ))}
    </div>
  );
};

export default SocialLogin;
