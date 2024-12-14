interface Routes {
  HOME: string;
  SIGN_IN: string;
  SIGN_UP: string;
  COMMUNITY: string;
  COLLECTION: string;
  JOBS: string;
  PROFILE: (id: string) => string;
  TAGS: (id: string) => string;
  ASK_QUESTION: string;
}

const ROUTES: Routes = {
  HOME: '/',
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
  COMMUNITY: '/community',
  COLLECTION: '/collection',
  JOBS: '/jobs',
  PROFILE: (id: string) => `/profile/${id}`,
  TAGS: (id: string) => `/tags/${id}`,
  ASK_QUESTION: '/ask-question',
};

export default ROUTES;
