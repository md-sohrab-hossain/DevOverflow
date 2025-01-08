'use client';

import React from 'react';

import AuthForm from '@/components/forms/AuthForm';
import { AUTH_FORM_CONFIGS } from '@/constants/formConfig';
import { signUpWithCredentials } from '@/lib/actions/auth.action';
import { SignUpSchema } from '@/lib/validations';

const FORM_TYPE = 'SIGN_UP';

const SignUp = () => {
  const { SIGN_UP } = AUTH_FORM_CONFIGS;

  return <AuthForm formType={FORM_TYPE} schema={SignUpSchema} formConfig={SIGN_UP} onSubmit={signUpWithCredentials} />;
};

export default SignUp;
