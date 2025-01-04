import ROUTES from '@/constants/routes';

type FormType = 'SIGN_IN' | 'SIGN_UP';

export interface FormConfig {
  fields: Array<{ name: string; label: string; type: string }>;
  altLink: { text: string; label: string; href: string };
  defaultValues: Record<string, string>;
  successMessage: string;
}

export const AUTH_FORM_CONFIGS: Record<FormType, FormConfig> = {
  SIGN_IN: {
    fields: [
      { name: 'email', label: 'Email Address', type: 'text' },
      { name: 'password', label: 'Password', type: 'password' },
    ],
    defaultValues: { email: '', password: '' },
    altLink: { text: "Don't have an account? ", label: 'Sign up', href: ROUTES.SIGN_UP },
    successMessage: 'Signed in successfully',
  },
  SIGN_UP: {
    fields: [
      { name: 'username', label: 'Username', type: 'text' },
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'email', label: 'Email Address', type: 'text' },
      { name: 'password', label: 'Password', type: 'password' },
    ],
    defaultValues: { username: '', name: '', email: '', password: '' },
    altLink: { text: 'Already have an account? ', label: 'Sign in', href: ROUTES.SIGN_IN },
    successMessage: 'Signed up successfully',
  },
};
