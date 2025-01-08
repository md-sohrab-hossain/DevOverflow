import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

import { AskQuestionSchema } from '@/lib/validations';

import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '../ui/form';
import { Input } from '../ui/input';

type AskQuestionFormData = z.infer<typeof AskQuestionSchema>;

export const QuestionTitleField: React.FC<{ form: UseFormReturn<AskQuestionFormData> }> = ({ form }) => (
  <FormField
    control={form.control}
    name="title"
    render={({ field }) => (
      <FormItem className="flex w-full flex-col">
        <FormLabel className="paragraph-semibold text-dark400_light800">
          Question Title <span className="text-primary-500">*</span>
        </FormLabel>
        <FormControl>
          <Input
            className="paragraph-regular background-light700_dark300 light-border-2 text-dark300_light700 no-focus min-h-[56px] border"
            {...field}
          />
        </FormControl>
        <FormDescription className="body-regular mt-2.5 text-light-500">
          Be specific and imagine you&apos;re asking a question to another person.
        </FormDescription>
        <FormMessage />
      </FormItem>
    )}
  />
);
