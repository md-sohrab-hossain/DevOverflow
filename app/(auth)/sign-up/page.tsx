'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { z } from 'zod';

import AuthForm from '@/components/forms/AuthForm';
import { AUTH_FORM_CONFIGS } from '@/constants/formConfig';
import ROUTES from '@/constants/routes';
import { toast } from '@/hooks/use-toast';
import { signUpWithCredentials } from '@/lib/actions/signUp.action';
import { SignUpSchema } from '@/lib/validations';

const FORM_TYPE = 'SIGN_UP';

const SignUp = () => {
  const router = useRouter();
  const { SIGN_UP } = AUTH_FORM_CONFIGS;

  const handleSignup = async (data: z.infer<typeof SignUpSchema>) => {
    const result = (await signUpWithCredentials(data)) as ActionResponse;

    if (result?.success) {
      toast({
        title: 'Success',
        description: SIGN_UP.successMessage,
      });

      router.push(ROUTES.HOME);
    } else {
      toast({
        title: `Error ${result?.status}`,
        description: result?.error?.message,
        variant: 'destructive',
      });
    }
  };

  return <AuthForm formType={FORM_TYPE} schema={SignUpSchema} formConfig={SIGN_UP} onSubmit={handleSignup} />;
};

export default SignUp;
