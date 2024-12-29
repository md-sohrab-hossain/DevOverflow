/**
 * NextAuth configuration file for handling OAuth authentication with GitHub and Google
 * providers. Includes custom callbacks for session handling, JWT processing, and sign-in flow.
 */

import NextAuth, { Session, Account, Profile, DefaultSession, User } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

import { IAccount } from '@/database/account.model';
import { api } from '@/lib/api';

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
 * @param provider - The OAuth provider ('github' or 'google')
 * @param profile - The user's profile from the OAuth provider
 * @param userName - Fallback username from the base user object
 * @returns Formatted username string
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
 * Creates a standardized us er info object from various authentication sources
 * @param user - Base user object from OAuth provider
 * @param account - Account information from the provider
 * @param profile - Extended profile information (especially important for GitHub)
 * @returns Standardized user information object
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
 * @param account - Account information including type and provider ID
 * @param token - JWT token containing email information
 * @returns Promise resolving to user ID if found
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

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],
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

      // Attempt to sign in or create account
      const { success } = (await api.auth.oAuthSignIn({
        user: userInfo,
        provider: account.provider as Provider,
        providerAccountId: account.providerAccountId,
      })) as ActionResponse;

      return success;
    },
  },
});
