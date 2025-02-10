import { MDXEditorMethods } from '@mdxeditor/editor';
import dynamic from 'next/dynamic';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

import { AskQuestionSchema } from '@/lib/validations';

import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '../ui/form';

type AskQuestionFormData = z.infer<typeof AskQuestionSchema>;

const Editor = dynamic(() => import('@/components/editor'), {
  ssr: false,
});

interface QuestionContentFieldProps {
  form: UseFormReturn<AskQuestionFormData>;
  editorRef: React.RefObject<MDXEditorMethods>;
}

export const QuestionContentField: React.FC<QuestionContentFieldProps> = ({ form, editorRef }) => (
  <FormField
    control={form.control}
    name="content"
    render={({ field }) => (
      <FormItem className="flex w-full flex-col">
        <FormLabel className="paragraph-semibold text-dark400_light800">
          Detailed explanation of your problem <span className="text-primary-500">*</span>
        </FormLabel>
        <FormControl>
          <Editor value={field.value} editorRef={editorRef} fieldChange={field.onChange} />
        </FormControl>
        <FormDescription className="body-regular mt-2.5 text-light-500">
          Introduce the problem and expand on what you&apos;ve put in the title.
        </FormDescription>
        <FormMessage />
      </FormItem>
    )}
  />
);
