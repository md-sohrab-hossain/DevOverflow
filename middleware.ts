import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export { auth as authMiddleware } from '@/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/question/') && !pathname.includes('/edit')) {
    const response = NextResponse.next();

    const questionId = pathname.split('/')[2];

    // Get the current view count from the cookie (or initialize to '0' if it doesn't exist)
    const currentViewCount = request.cookies.get(questionId)?.value;

    // If the cookie doesn't exist or is invalid, initialize it as '0'
    const viewCount = currentViewCount ? parseInt(currentViewCount, 10) : 0;

    const updatedViewCount = viewCount + 1;

    response.cookies.set(questionId, updatedViewCount.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 120, // 2 minutes or however long you'd like to track
    });

    return response;
  }

  return NextResponse.next();
}
