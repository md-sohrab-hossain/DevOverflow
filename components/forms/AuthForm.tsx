"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  Path,
  useForm,
  FieldValues,
  DefaultValues,
  SubmitHandler,
} from "react-hook-form";
import { ZodType, z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import ROUTES from "@/constants/routes";

const SIGN_IN_OPTIONS = {
  email: "",
  password: "",
};

const SIGN_UP_OPTIONS = {
  username: "",
  name: "",
  email: "",
  password: "",
};

interface AuthFormProps<T extends FieldValues> {
  schema: ZodType<T>;
  formType: "SIGN_IN" | "SIGN_UP";
  onSubmit: (data: T) => Promise<{ success: boolean }>;
}

const AuthForm = <T extends FieldValues>({
  schema,
  onSubmit,
  formType,
}: AuthFormProps<T>) => {
  const options = formType === "SIGN_IN" ? SIGN_IN_OPTIONS : SIGN_UP_OPTIONS;

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: options as unknown as DefaultValues<T>,
  });

  const handleSubmit: SubmitHandler<T> = async (data) => {
    await onSubmit(data);
  };

  const buttonText = form.formState.isSubmitting
    ? formType === "SIGN_IN"
      ? "Signing In..."
      : "Signing Up..."
    : formType === "SIGN_IN"
      ? "Sign In"
      : "Sign Up";

  return (
    <Form {...form}>
      <form
        className="mt-10 space-y-6"
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        {Object.keys(options).map((fieldName) => (
          <FormField
            key={fieldName}
            control={form.control}
            name={fieldName as Path<T>}
            render={({ field }) => (
              <FormItem className="flex w-full flex-col gap-2.5">
                <FormLabel className="paragraph-medium text-dark400_light700 capitalize">
                  {fieldName === "email" ? "Email Address" : fieldName}
                </FormLabel>
                <FormControl>
                  <Input
                    required
                    {...field}
                    type={fieldName === "password" ? "password" : "text"}
                    className="paragraph-regular background-light900_dark300 light-border-2 text-dark300_light700 no-focus min-h-12 rounded-1.5 border"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <Button
          disabled={form.formState.isSubmitting}
          className="primary-gradient paragraph-medium min-h-12 w-full rounded-2 px-4 py-3 font-inter !text-light-900"
        >
          {buttonText}
        </Button>

        {formType === "SIGN_IN" ? (
          <p>
            {"Don't have an account? "}
            <Link
              href={ROUTES.SIGN_UP}
              className="paragraph-semibold primary-text-gradient"
            >
              Sign up
            </Link>
          </p>
        ) : (
          <p>
            Already have an account?{" "}
            <Link
              href={ROUTES.SIGN_IN}
              className="paragraph-semibold primary-text-gradient"
            >
              Sign in
            </Link>
          </p>
        )}
      </form>
    </Form>
  );
};

export default AuthForm;
