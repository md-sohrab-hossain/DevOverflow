'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { DefaultValues, FieldValues, useForm, Control, Path } from 'react-hook-form';
import { z, ZodType } from 'zod';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FormConfig } from '@/constants/formConfig';

interface AuthFormProps<T extends FieldValues> {
  schema: ZodType<T>;
  formType: 'SIGN_IN' | 'SIGN_UP';
  formConfig: FormConfig;
  onSubmit: (data: T) => void;
}

interface ICustomFormField<T extends FieldValues> {
  field: { label: string; type: string };
  control: Control<T>;
  name: Path<T>;
}

const CustomFormField = <T extends FieldValues>({ field, control, name }: ICustomFormField<T>) => (
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

export default function AuthForm<T extends FieldValues>({ schema, formType, formConfig, onSubmit }: AuthFormProps<T>) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: formConfig.defaultValues as DefaultValues<T>,
  });

  const buttonText = form.formState.isSubmitting
    ? `Signing ${formType === 'SIGN_IN' ? 'In' : 'Up'}...`
    : `Sign ${formType === 'SIGN_IN' ? 'In' : 'Up'}`;

  return (
    <Form {...form}>
      <form className="mt-10 space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        {formConfig.fields.map(field => (
          <CustomFormField key={field.name} field={field} control={form.control} name={field.name as Path<T>} />
        ))}

        <Button
          disabled={form.formState.isSubmitting}
          className="primary-gradient paragraph-medium min-h-12 w-full rounded-2 px-4 py-3 font-inter !text-light-900"
        >
          {buttonText}
        </Button>

        <p>
          {formConfig.altLink.text}
          <Link href={formConfig.altLink.href} className="paragraph-semibold primary-text-gradient">
            {formConfig.altLink.label}
          </Link>
        </p>
      </form>
    </Form>
  );
}
