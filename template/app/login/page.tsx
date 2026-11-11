import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Sign in</h1>
      <LoginForm />
    </>
  );
}
