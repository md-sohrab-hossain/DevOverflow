"use client";

import React from "react";

import AuthForm from "@/components/forms/AuthForm";
import { SignInSchema } from "@/lib/validations";

const SignIn = () => {
  const handleSignIn = async (data: { email: string; password: string }) => {
    // Replace this with your API call logic
    try {
      const response = await fetch("/api/signin", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (response.ok) {
        return { success: true };
      } else {
        // Handle error response
        return { success: false };
      }
    } catch (error) {
      console.error("Sign-in error:", error);
      return { success: false };
    }
  };

  return (
    <AuthForm
      formType="SIGN_IN"
      schema={SignInSchema}
      onSubmit={handleSignIn}
    />
  );
};

export default SignIn;
