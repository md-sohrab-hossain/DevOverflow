'use server';

import { auth } from '@/auth';
import { api } from '@/lib/api';

export async function generateAIAnswer(questionTitle: string, questionContent: string, userAnswer?: string) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      success: false,
      error: { message: 'You need to be logged in to use this feature' },
    };
  }

  try {
    const response = await api.ai.getAnswer(questionTitle, questionContent, userAnswer);
    if (!response.success) {
      return response;
    }

    const formattedAnswer = response.data.replace(/<br>/g, '\n').replace(/N\/A/g, '').toString().trim();

    return {
      success: true,
      data: formattedAnswer,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'There was a problem with your request',
      },
    };
  }
}
