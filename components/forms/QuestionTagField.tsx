import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

import { AskQuestionSchema } from '@/lib/validations';

import TagCard from '../cards/TagCards';
import { Input } from '../ui/input';

type AskQuestionFormData = z.infer<typeof AskQuestionSchema>;

interface QuestionTagFieldProps {
  form: UseFormReturn<AskQuestionFormData>;
  field: {
    value: string[];
    onChange: (value: string[]) => void;
  };
}

export const QuestionTagField = ({ form, field }: QuestionTagFieldProps) => {
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tagInput = e.currentTarget.value.trim();

      if (!tagInput) return;

      if (tagInput.length > 15) {
        form.setError('tags', {
          type: 'manual',
          message: 'Tag should be less than 15 characters',
        });
        return;
      }

      if (field.value.includes(tagInput)) {
        form.setError('tags', {
          type: 'manual',
          message: 'Tag already exists',
        });
        return;
      }

      if (field.value.length >= 3) {
        form.setError('tags', {
          type: 'manual',
          message: 'You can only add up to 3 tags',
        });
        return;
      }

      form.setValue('tags', [...field.value, tagInput]);
      e.currentTarget.value = '';
      form.clearErrors('tags');
    }
  };

  const handleTagRemove = (tag: string) => {
    const newTags = field.value.filter(t => t !== tag);
    form.setValue('tags', newTags);

    if (newTags.length === 0) {
      form.setError('tags', {
        type: 'manual',
        message: 'Tags are required',
      });
    }
  };

  return (
    <div>
      <Input
        className="paragraph-regular background-light700_dark300 light-border-2 text-dark300_light700 no-focus min-h-[56px] border"
        placeholder="Add tags..."
        onKeyDown={handleInputKeyDown}
      />
      {field.value.length > 0 && (
        <div className="flex-start mt-2.5 flex-wrap gap-2.5">
          {field.value.map((tag: string) => (
            <TagCard key={tag} _id={tag} name={tag} remove isButton handleRemove={() => handleTagRemove(tag)} />
          ))}
        </div>
      )}
    </div>
  );
};
