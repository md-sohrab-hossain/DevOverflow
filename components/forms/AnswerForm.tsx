'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MDXEditorMethods } from '@mdxeditor/editor';
import { ReloadIcon } from '@radix-ui/react-icons';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRef, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { createAnswer } from '@/lib/actions/createAnswer.action';
import { generateAIAnswer } from '@/lib/actions/generateAiAnswer.action';
import { AnswerSchema } from '@/lib/validations';

// Dynamically import the Editor component
const Editor = dynamic(() => import('@/components/editor'), {
  ssr: false,
});

type AnswerFormProps = {
  questionId: string;
  questionTitle: string;
  questionContent: string;
};

type AnswerFormValues = z.infer<typeof AnswerSchema>;

interface LoadingButtonProps {
  isLoading: boolean;
  loadingText: string;
  defaultText: string;
  icon?: React.ReactNode;
  className?: string;
  type?: 'submit' | 'button';
}

const AnswerForm = ({ questionId, questionTitle, questionContent }: AnswerFormProps) => {
  const [isPending, startTransition] = useTransition();
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const editorRef = useRef<MDXEditorMethods>(null);

  const form = useForm<AnswerFormValues>({
    resolver: zodResolver(AnswerSchema),
    defaultValues: {
      content: '',
    },
  });

  const handleSubmit = async (values: AnswerFormValues) => {
    startTransition(async () => {
      try {
        const result = await createAnswer({
          questionId,
          content: values.content,
        });

        if (result.success) {
          form.reset();
          toast({
            title: 'Success',
            description: 'Your answer has been posted successfully',
          });

          if (editorRef.current) {
            editorRef.current.setMarkdown('');
          }
        } else {
          toast({
            title: 'Error',
            description: result.error?.message || 'Something went wrong',
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: `Failed to submit answer: ${error}`,
          variant: 'destructive',
        });
      }
    });
  };

  // Generate AI answer
  const handleGenerateAIAnswer = async () => {
    setIsGeneratingAI(true);

    try {
      const userAnswer = editorRef.current?.getMarkdown();
      const result = await generateAIAnswer(questionTitle, questionContent, userAnswer);

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error?.message,
          variant: 'destructive',
        });
        return;
      }

      if (editorRef.current) {
        editorRef.current.setMarkdown(result.data);
        form.setValue('content', result.data, {
          shouldDirty: true,
          shouldValidate: true,
        });
        form.trigger('content');
      }

      toast({
        title: 'Success',
        description: 'AI-generated answer has been created',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'There was a problem with your request',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center sm:gap-2">
        <h4 className="paragraph-semibold text-dark400_light800">Write your answer here</h4>
        <AIGenerateButton isLoading={isGeneratingAI} onClick={handleGenerateAIAnswer} />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-6 flex w-full flex-col gap-10">
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col gap-3">
                <FormControl>
                  <Editor editorRef={editorRef} value={field.value} fieldChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <SubmitButton isLoading={isPending} />
          </div>
        </form>
      </Form>
    </div>
  );
};

const AIGenerateButton = ({ isLoading, onClick }: { isLoading: boolean; onClick: () => void }) => (
  <LoadingButton
    isLoading={isLoading}
    loadingText="Generating..."
    defaultText="Generate AI Answer"
    className="btn light-border-2 gap-1.5 rounded-md border px-4 py-2.5 text-primary-500 shadow-none dark:text-primary-500"
    icon={<Image src="/icons/stars.svg" alt="Generate AI Answer" width={12} height={12} className="object-contain" />}
    onClick={onClick}
  />
);

const SubmitButton = ({ isLoading }: { isLoading: boolean }) => (
  <LoadingButton
    type="submit"
    isLoading={isLoading}
    loadingText="Posting..."
    defaultText="Post Answer"
    className="primary-gradient w-fit"
  />
);

const LoadingButton = ({
  type = 'button',
  icon,
  isLoading,
  loadingText,
  defaultText,
  className,
  onClick,
}: LoadingButtonProps & { onClick?: () => void }) => (
  <Button type={type} className={className} disabled={isLoading} onClick={onClick}>
    {isLoading ? (
      <>
        <ReloadIcon className="mr-2 size-4 animate-spin" />
        {loadingText}
      </>
    ) : (
      <>
        {icon}
        {defaultText}
      </>
    )}
  </Button>
);

export default AnswerForm;
