import bcrypt from 'bcryptjs';
import NextAuth, { Session, Account, Profile, DefaultSession, User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

import { IAccount } from '@/database/account.model';
import { api } from '@/lib/api';

import { IUser } from './database/user.model';
import { SignInSchema } from './lib/validations';

const WAIT_TIMEOUT = 2000;
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

/**
 * Authorizes a user with credentials
 */
const authorizeUser = async (credentials: Partial<Record<string, unknown>>) => {
  const validatedFields = SignInSchema.safeParse(credentials);
  if (!validatedFields.success) {
    return null;
  }

  const { email, password } = validatedFields.data;
  const { data: existingAccount } = (await api.accounts.getByProvider(email)) as ActionResponse<IAccount>;
  if (!existingAccount) {
    return null;
  }

  const { data: existingUser } = (await api.users.getById(existingAccount.userId.toString())) as ActionResponse<IUser>;
  if (!existingUser) {
    return null;
  }

  const isValidPassword = await bcrypt.compare(password, existingAccount.password!);
  if (!isValidPassword) {
    return null;
  }

  return { id: existingUser.id, name: existingUser.name, email: existingUser.email, image: existingUser.image };
};

/**
 * Retry mechanism for OAuth sign-in
 */
const retryOAuthSignIn = async (userInfo: UserInfo, provider: Provider, providerAccountId: string) => {
  let attempt = 0;
  let success = false;
  const maxAttempts = 5;
  const retryDelay = 5000; // 5 seconds

  while (attempt < maxAttempts) {
    try {
      // Attempt to sign in or create account
      const response = (await api.auth.oAuthSignIn(
        {
          user: userInfo,
          provider,
          providerAccountId,
        },
        WAIT_TIMEOUT
      )) as ActionResponse;

      success = response.success;
      if (success) break;
    } catch (error) {
      console.log(`Sign-in attempt ${attempt + 1} failed:`, error);
      attempt++;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryDelay)); // Wait before retrying
      }
    }
  }

  return success;
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
      console.log('Sign-in attempt:', {
        user: { name: user.name, email: user.email },
        account: { provider: account?.provider, type: account?.type },
        profile: { login: (profile as GoogleProfile | GithubProfile)?.login },
      });

      // Allow credential-based sign-in
      if (account?.type === 'credentials') return true;
      if (!account || !user) return false;

      // Create standardized user info
      const userInfo = createUserInfo(user, account, profile as GithubProfile | GoogleProfile);

      // Retry mechanism for OAuth sign-in
      return retryOAuthSignIn(userInfo, account.provider as Provider, account.providerAccountId);
    },
  },
});
