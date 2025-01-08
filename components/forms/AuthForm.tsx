'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ReloadIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { DefaultValues, FieldValues, useForm, Control, Path, SubmitHandler } from 'react-hook-form';
import { z, ZodType } from 'zod';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AUTH_FORM_CONFIGS, FormConfig } from '@/constants/formConfig';
import ROUTES from '@/constants/routes';
import { toast } from '@/hooks/use-toast';

interface AuthFormProps<T extends FieldValues> {
  schema: ZodType<T>;
  formType: 'SIGN_IN' | 'SIGN_UP';
  formConfig: FormConfig;
  onSubmit: (data: T) => Promise<ActionResponse>;
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { SIGN_IN, SIGN_UP } = AUTH_FORM_CONFIGS;

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: formConfig.defaultValues as DefaultValues<T>,
  });

  const buttonText = isPending
    ? `Signing ${formType === 'SIGN_IN' ? 'In' : 'Up'}...`
    : `Sign ${formType === 'SIGN_IN' ? 'In' : 'Up'}`;

  const handleSubmit: SubmitHandler<T> = async data => {
    startTransition(async () => {
      const result = (await onSubmit(data)) as ActionResponse;

      if (result?.success) {
        toast({
          title: 'Success',
          description: formType === 'SIGN_IN' ? SIGN_IN.successMessage : SIGN_UP.successMessage,
        });

        router.push(ROUTES.HOME);
      } else {
        toast({
          title: `Error ${result?.status}`,
          description: result?.error?.message,
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form className="mt-10 space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
        {formConfig.fields.map(field => (
          <CustomFormField key={field.name} field={field} control={form.control} name={field.name as Path<T>} />
        ))}

        <Button
          disabled={isPending}
          className="primary-gradient paragraph-medium min-h-12 w-full rounded-2 px-4 py-3 font-inter !text-light-900"
        >
          {isPending && <ReloadIcon className="mr-2 size-4 animate-spin" />}
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
