interface Routes {
  HOME: string;
  SIGN_IN: string;
  SIGN_UP: string;
  COMMUNITY: string;
  COLLECTION: string;
  JOBS: string;
  TAGS: (id: string) => string;
  PROFILE: (id: string) => string;
  QUESTION: (id: string) => string;
  ASK_QUESTION: string;
  SIGN_IN_WITH_OAUTH: string;
}

const ROUTES: Routes = {
  HOME: '/',
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
  COMMUNITY: '/community',
  COLLECTION: '/collection',
  JOBS: '/jobs',
  TAGS: (id: string) => `/tags/${id}`,
  PROFILE: (id: string) => `/profile/${id}`,
  QUESTION: (id: string) => `/question/${id}`,
  ASK_QUESTION: '/ask-question',
  SIGN_IN_WITH_OAUTH: 'signin-with-oauth',
};

export default ROUTES;
