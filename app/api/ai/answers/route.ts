import { NextResponse } from 'next/server';
import OpenAI from 'openai';

import handleError from '@/lib/handlers/error';
import { ValidationError } from '@/lib/http-errors';
import { AIAnswerSchema } from '@/lib/validations';

interface AIRequestData {
  question: string;
  content: string;
  userAnswer?: string;
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API Key');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const requestData: AIRequestData = await req.json();
    const validatedData = validateRequest(requestData);

    const generatedText = await generateAIResponse(validatedData);

    return NextResponse.json({ success: true, data: generatedText }, { status: 200 });
  } catch (error) {
    return handleError(error, 'api') as NextResponse;
  }
}

function validateRequest(data: AIRequestData): AIRequestData {
  const validationResult = AIAnswerSchema.safeParse(data);

  if (!validationResult.success) {
    throw new ValidationError(validationResult.error.flatten().fieldErrors);
  }

  return validationResult.data;
}

async function generateAIResponse({ question, content, userAnswer }: AIRequestData): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that provides informative responses in markdown format. Use appropriate markdown syntax for headings, lists, code blocks, and emphasis where necessary. 
            For code blocks, use short-form smaller case language identifiers (e.g., 'js' for JavaScript, 'py' for Python, 'ts' for TypeScript, 'html' for HTML, 'css' for CSS, etc.).`,
        },
        {
          role: 'user',
          content: `Generate a markdown-formatted response to the following question: "${question}".Consider the provided context: **Context:** ${content} Also, 
            prioritize and incorporate the user's answer when formulating your response: **User's Answer:** ${userAnswer} Prioritize the user's answer only if it's correct. 
            If it's incomplete or incorrect, improve or correct it while keeping the response concise and to the point. Provide the final answer in markdown format.`,
        },
      ],
    });

    return completion.choices[0]?.message?.content || 'No response generated';
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}
