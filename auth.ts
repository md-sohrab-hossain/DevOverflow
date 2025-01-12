import bcrypt from 'bcryptjs';
import NextAuth, { Session, Account, Profile, DefaultSession, User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

import { IAccount, IAccountDoc } from '@/database/account.model';
import { api } from '@/lib/api';

import { IUserDoc } from './database/user.model';
import { SignInSchema } from './lib/validations';

type Provider = 'github' | 'google';

interface UserInfo {
  name: string;
  email: string;
  image: string;
  username: string;
}

interface GithubProfile extends Profile {
  login: string;
}

interface GoogleProfile extends Profile {
  email: string;
  name: string;
  picture?: string;
}

interface ExtendedSession extends Session {
  user: DefaultSession['user'] & {
    id: string;
  };
}

/**
 * Determines the username based on the provider and profile information
 */
const getUsernameFromProfile = (
  provider: string,
  profile: GithubProfile | GoogleProfile | null | undefined,
  userName: string
): string => {
  if (provider === 'github' && (profile as GithubProfile)?.login) {
    return (profile as GithubProfile).login;
  }
  return userName.toLowerCase();
};

/**
 * Creates a standardized user info object from various authentication sources
 */
const createUserInfo = (
  user: User,
  account: Pick<Account, 'provider'>,
  profile: GithubProfile | GoogleProfile | null | undefined
): UserInfo => ({
  name: user.name ?? '',
  email: user.email ?? '',
  image: user.image ?? '',
  username: getUsernameFromProfile(account.provider, profile, user.name ?? ''),
});

/**
 * Looks up existing account information in the database
 */
const handleAccountLookup = async (
  account: Pick<Account, 'type' | 'providerAccountId'>,
  token: { email?: string | null }
): Promise<string | undefined> => {
  const providerId = account.type === 'credentials' ? token.email! : account.providerAccountId;
  const { data: existingAccount, success } = (await api.accounts.getByProvider(providerId)) as ActionResponse<IAccount>;

  if (!success || !existingAccount) return undefined;
  return existingAccount.userId?.toString();
};

const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * Authorizes a user with credentials
 */
const authorizeUser = async (credentials: Partial<Record<string, unknown>>) => {
  try {
    const validatedFields = SignInSchema.safeParse(credentials);
    if (!validatedFields.success) {
      throw new Error('Invalid credentials format');
    }

    const { email, password } = validatedFields.data;
    const account = (await api.accounts.getByProvider(email)) as ActionResponse<IAccountDoc>;
    const user =
      account?.data && ((await api.users.getById(account.data.userId.toString())) as ActionResponse<IUserDoc>);

    if (!account?.data || !user?.data || !(await verifyPassword(password, account.data.password!))) {
      throw new Error('Invalid credentials');
    }

    return {
      id: user.data.id,
      name: user.data.name,
      email: user.data.email,
      image: user.data.image,
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
};

/**
 * OAuth sign-in
 */
const oAuthSignIn = async (userInfo: UserInfo, provider: Provider, providerAccountId: string) => {
  const response = (await api.auth.oAuthSignIn({
    user: userInfo,
    provider,
    providerAccountId,
  })) as ActionResponse;

  return response.success;
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  // https://next-auth.js.org/configuration/providers/oauth
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
    // https://next-auth.js.org/configuration/providers/credentials
    Credentials({
      async authorize(credentials) {
        return authorizeUser(credentials);
      },
    }),
  ],

  // https://next-auth.js.org/configuration/callbacks
  callbacks: {
    /**
     * Called whenever a session is checked
     * Adds the user ID to the session information
     */
    async session({ session, token }): Promise<ExtendedSession> {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub as string,
        },
      };
    },

    /**
     * Called whenever a JWT is created or updated
     * Handles linking the token to existing accounts
     */
    async jwt({ token, account }) {
      if (!account) return token;

      const userId = await handleAccountLookup(account, token);
      if (userId) token.sub = userId;

      return token;
    },

    /**
     * Called when a user signs in
     * Handles the OAuth sign-in flow and account creation/linking
     */
    async signIn({ user, profile, account }) {
      // Allow credential-based sign-in
      if (account?.type === 'credentials') return true;
      if (!account || !user) return false;

      // Create standardized user info
      const userInfo = createUserInfo(user, account, profile as GithubProfile | GoogleProfile);

      return oAuthSignIn(userInfo, account.provider as Provider, account.providerAccountId);
    },
  },
});
