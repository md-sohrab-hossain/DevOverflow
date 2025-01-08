'use client';

import React from 'react';

import AuthForm from '@/components/forms/AuthForm';
import { AUTH_FORM_CONFIGS } from '@/constants/formConfig';
import { signInWithCredentials } from '@/lib/actions/auth.action';
import { SignInSchema } from '@/lib/validations';

const FORM_TYPE = 'SIGN_IN';

const SignIn = () => {
  const { SIGN_IN } = AUTH_FORM_CONFIGS;

  return <AuthForm formType={FORM_TYPE} schema={SignInSchema} formConfig={SIGN_IN} onSubmit={signInWithCredentials} />;
};

export default SignIn;
