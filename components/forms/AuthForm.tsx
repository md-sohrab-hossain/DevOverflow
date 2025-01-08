'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ReloadIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { DefaultValues, FieldValues, Path, useForm } from 'react-hook-form';
import { z, ZodType } from 'zod';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FormConfig } from '@/constants/formConfig';

import { AuthFormField } from './AuthFormField';

interface AuthFormProps<T extends FieldValues> {
  schema: ZodType<T>;
  formType: 'SIGN_IN' | 'SIGN_UP';
  formConfig: FormConfig;
  onSubmit: (data: T) => void;
}

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
          <AuthFormField key={field.name} field={field} control={form.control} name={field.name as Path<T>} />
        ))}

        <Button
          disabled={form.formState.isSubmitting}
          className="primary-gradient paragraph-medium min-h-12 w-full rounded-2 px-4 py-3 font-inter !text-light-900"
        >
          {form.formState.isSubmitting && <ReloadIcon className="mr-2 size-4 animate-spin" />}
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
