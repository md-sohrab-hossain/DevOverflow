'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { z } from 'zod';

import AuthForm from '@/components/forms/AuthForm';
import { AUTH_FORM_CONFIGS } from '@/constants/formConfig';
import ROUTES from '@/constants/routes';
import { toast } from '@/hooks/use-toast';
import { signInWithCredentials } from '@/lib/actions/signIn.action';
import { SignInSchema } from '@/lib/validations';

const FORM_TYPE = 'SIGN_IN';

const SignIn = () => {
  const router = useRouter();
  const { SIGN_IN } = AUTH_FORM_CONFIGS;

  const handleSignIn = async (data: z.infer<typeof SignInSchema>) => {
    const result = (await signInWithCredentials(data)) as ActionResponse;

    if (result?.success) {
      toast({
        title: 'Success',
        description: SIGN_IN.successMessage,
      });

      router.push(ROUTES.HOME);
    } else {
      const message = result?.error?.message;

      toast({
        title: `Error ${result?.status}`,
        description: message && message.includes('credentials') ? 'Invalid Credentials' : message,
        variant: 'destructive',
      });
    }
  };

  return <AuthForm formType={FORM_TYPE} schema={SignInSchema} formConfig={SIGN_IN} onSubmit={handleSignIn} />;
};

export default SignIn;
