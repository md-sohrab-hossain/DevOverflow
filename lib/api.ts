import ROUTES from '@/constants/routes';
import { IAccount } from '@/database/account.model';
import { IUser } from '@/database/user.model';

import { fetchHandler } from './handlers/fetch';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

const makeApiRequest = async <T>(
  endpoint: string,
  method: string = 'GET',
  body: unknown = null,
  timeout: number = 5000,
  headers: HeadersInit = {}
): Promise<ActionResponse<T>> => {
  const options: RequestInit = { method, headers: { ...headers } };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return fetchHandler(endpoint, { ...options, timeout });
};

export const api = {
  auth: {
    oAuthSignIn: ({ user, provider, providerAccountId }: SignInWithOAuthParams, timeout: number) =>
      makeApiRequest(
        `${API_BASE_URL}/auth/${ROUTES.SIGN_IN_WITH_OAUTH}`,
        'POST',
        {
          user,
          provider,
          providerAccountId,
        },
        timeout
      ),
  },
  users: {
    getAll: () => makeApiRequest<IUser[]>(`${API_BASE_URL}/users`),
    getById: (id: string) => makeApiRequest<IUser>(`${API_BASE_URL}/users/${id}`),
    getByEmail: (email: string) => makeApiRequest<IUser>(`${API_BASE_URL}/users/email`, 'POST', { email }),
    create: (userData: Partial<IUser>) => makeApiRequest<IUser>(`${API_BASE_URL}/users`, 'POST', userData),
    update: (id: string, userData: Partial<IUser>) =>
      makeApiRequest<IUser>(`${API_BASE_URL}/users/${id}`, 'PUT', userData),
    delete: (id: string) => makeApiRequest<IUser>(`${API_BASE_URL}/users/${id}`, 'DELETE'),
  },

  accounts: {
    getAll: () => makeApiRequest<IAccount[]>(`${API_BASE_URL}/accounts`),
    getById: (id: string) => makeApiRequest<IAccount>(`${API_BASE_URL}/accounts/${id}`),
    getByProvider: (providerAccountId: string) =>
      makeApiRequest<IAccount>(`${API_BASE_URL}/accounts/provider`, 'POST', { providerAccountId }),
    create: (accountData: Partial<IAccount>) =>
      makeApiRequest<IAccount>(`${API_BASE_URL}/accounts`, 'POST', accountData),
    update: (id: string, accountData: Partial<IAccount>) =>
      makeApiRequest<IAccount>(`${API_BASE_URL}/accounts/${id}`, 'PUT', accountData),
    delete: (id: string) => makeApiRequest<IAccount>(`${API_BASE_URL}/accounts/${id}`, 'DELETE'),
  },
};
