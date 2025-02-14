import ROUTES from '@/constants/routes';
import { IAccount } from '@/database/account.model';
import { IUser } from '@/database/user.model';

import { fetchHandler } from './handlers/fetch';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  timeout?: number;
  headers?: HeadersInit;
  maxRetries?: number;
  retryDelay?: number;
}

const makeApiRequest = async <T>(endpoint: string, options: RequestOptions = {}): Promise<ActionResponse<T>> => {
  const { method = 'GET', body = null, timeout = 5000, headers = {}, maxRetries, retryDelay } = options;

  const requestOptions: RequestInit = {
    method,
    headers: { ...headers },
  };

  if (body && method !== 'GET') {
    requestOptions.body = JSON.stringify(body);
  }

  return fetchHandler(`${API_BASE_URL}${endpoint}`, {
    ...requestOptions,
    timeout,
    maxRetries,
    retryDelay,
  });
};

const createApiMethods = <T>(basePath: string) => ({
  getAll: () => makeApiRequest<T[]>(basePath),
  getById: (id: string) => makeApiRequest<T>(`${basePath}/${id}`),
  create: (data: Partial<T>) => makeApiRequest<T>(basePath, { method: 'POST', body: data }),
  update: (id: string, data: Partial<T>) => makeApiRequest<T>(`${basePath}/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => makeApiRequest<T>(`${basePath}/${id}`, { method: 'DELETE' }),
});

export const api = {
  auth: {
    oAuthSignIn: (params: SignInWithOAuthParams) =>
      makeApiRequest(`/auth/${ROUTES.SIGN_IN_WITH_OAUTH}`, {
        method: 'POST',
        body: params,
        maxRetries: 5,
        retryDelay: 5000,
      }),
  },
  users: {
    ...createApiMethods<IUser>('/users'),
    getById: (id: string) =>
      makeApiRequest<IUser>(`/users/${id}`, {
        maxRetries: 3,
        retryDelay: 3000,
      }),
    getByEmail: (email: string) => makeApiRequest<IUser>('/users/email', { method: 'POST', body: { email } }),
  },
  accounts: {
    ...createApiMethods<IAccount>('/accounts'),
    getByProvider: (providerAccountId: string) =>
      makeApiRequest<IAccount>('/accounts/provider', { method: 'POST', body: { providerAccountId } }),
  },
  ai: {
    getAnswer: (question: string, content: string, userAnswer?: string): APIResponse<string> =>
      makeApiRequest('/ai/answers', { method: 'POST', body: { question, content, userAnswer }, timeout: 100000 }),
  },
};
