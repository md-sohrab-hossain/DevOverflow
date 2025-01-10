'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MDXEditorMethods } from '@mdxeditor/editor';
import { ReloadIcon } from '@radix-ui/react-icons';
import { useRouter } from 'next/navigation';
import React, { useRef, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import ROUTES from '@/constants/routes';
import { toast } from '@/hooks/use-toast';
import { createQuestion } from '@/lib/actions/createQuestion.action';
import { editQuestion } from '@/lib/actions/editQuestion.action';
import { AskQuestionSchema } from '@/lib/validations';

import { QuestionContentField } from './QuestionContentField';
import { QuestionTagField } from './QuestionTagField';
import { QuestionTitleField } from './QuestionTitleField';
import { Button } from '../ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';

type QuestionFormData = z.infer<typeof AskQuestionSchema>;

interface QuestionFormParams {
  question?: Question;
  isEdit?: boolean;
}

const QuestionForm = ({ question, isEdit = false }: QuestionFormParams) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<MDXEditorMethods>(null);

  const form = useForm<QuestionFormData>({
    resolver: zodResolver(AskQuestionSchema),
    defaultValues: {
      title: question?.title || '',
      content: question?.content || '',
      tags: question?.tags.map(tag => tag.name) || [],
    },
  });

  const handleQuestionForm = async (data: QuestionFormData) => {
    startTransition(async () => {
      const result =
        isEdit && question ? await editQuestion({ questionId: question._id, ...data }) : await createQuestion(data);

      if (result.success) {
        toast({
          title: 'Success',
          description: `Question ${isEdit ? 'updated' : 'created'} successfully`,
        });

        if (result.data) router.push(ROUTES.QUESTION(result.data._id));
      } else {
        toast({
          title: `Error ${result.status}`,
          description: result.error?.message || 'Something went wrong',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form className="flex w-full flex-col gap-10" onSubmit={form.handleSubmit(handleQuestionForm)}>
        <QuestionTitleField form={form} />
        <QuestionContentField form={form} editorRef={editorRef} />

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem className="flex w-full flex-col gap-3">
              <FormLabel className="paragraph-semibold text-dark400_light800">
                Tags <span className="text-primary-500">*</span>
              </FormLabel>
              <FormControl>
                <QuestionTagField form={form} field={field} />
              </FormControl>
              <FormDescription className="body-regular mt-2.5 text-light-500">
                Add up to 3 tags to describe what your question is about. You need to press enter to add a tag.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="mt-16 flex justify-end">
          <Button type="submit" disabled={isPending} className="primary-gradient w-fit !text-light-900">
            {isPending ? (
              <>
                <ReloadIcon className="mr-2 size-4 animate-spin" />
                <span>Submitting</span>
              </>
            ) : (
              <>Ask A Question</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default QuestionForm;
