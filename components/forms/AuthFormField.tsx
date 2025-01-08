import { Control, FieldValues, Path } from 'react-hook-form';

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

import { Input } from '../ui/input';

export interface FormFieldProps<T extends FieldValues> {
  field: { label: string; type: string };
  control: Control<T>;
  name: Path<T>;
}

export function AuthFormField<T extends FieldValues>({ field, control, name }: FormFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField }) => (
        <FormItem className="flex w-full flex-col gap-2.5">
          <FormLabel className="paragraph-medium text-dark400_light700">{field.label}</FormLabel>
          <FormControl>
            <Input
              required
              type={field.type}
              {...formField}
              className="paragraph-regular background-light900_dark300 light-border-2 text-dark300_light700 no-focus min-h-12 rounded-1.5 border"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
