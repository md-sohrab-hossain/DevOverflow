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
import { AnswerSchema } from '@/lib/validations';

// Dynamically import the Editor component
const Editor = dynamic(() => import('@/components/editor'), {
  ssr: false,
});

type AnswerFormProps = {
  questionId: string;
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

const AnswerForm = ({ questionId }: AnswerFormProps) => {
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

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center sm:gap-2">
        <h4 className="paragraph-semibold text-dark400_light800">Write your answer here</h4>
        <AIGenerateButton isLoading={isGeneratingAI} />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-6 flex w-full flex-col gap-10">
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col gap-3">
                <FormControl>
                  <Editor value={field.value} editorRef={editorRef} fieldChange={field.onChange} />
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

const AIGenerateButton = ({ isLoading }: { isLoading: boolean }) => (
  <LoadingButton
    isLoading={isLoading}
    loadingText="Generating..."
    defaultText="Generate AI Answer"
    className="btn light-border-2 gap-1.5 rounded-md border px-4 py-2.5 text-primary-500 shadow-none dark:text-primary-500"
    icon={<Image src="/icons/stars.svg" alt="Generate AI Answer" width={12} height={12} className="object-contain" />}
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
  isLoading,
  loadingText,
  defaultText,
  className,
  icon,
  type = 'button',
}: LoadingButtonProps) => (
  <Button type={type} className={className} disabled={isLoading}>
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
