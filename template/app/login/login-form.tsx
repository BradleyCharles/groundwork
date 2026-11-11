"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const errorRef = useRef<HTMLParagraphElement>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { error: authError } = await createClient().auth.signInWithPassword({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (authError) {
      setError("Email or password is incorrect.");
      queueMicrotask(() => errorRef.current?.focus());
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      {error ? (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="border-2 border-red-800 p-3 text-red-900"
        >
          {error}
        </p>
      ) : null}
      <div>
        <label htmlFor="email" className="block font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={error ? true : undefined}
          className="mt-1 w-full rounded border-2 border-gray-700 p-2"
        />
      </div>
      <div>
        <label htmlFor="password" className="block font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={error ? true : undefined}
          className="mt-1 w-full rounded border-2 border-gray-700 p-2"
        />
      </div>
      <button type="submit" className="rounded bg-blue-800 px-4 py-2 font-medium text-white">
        Sign in
      </button>
    </form>
  );
}
