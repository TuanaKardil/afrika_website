/// <reference types="react-dom/canary" />
"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type AuthState } from "@/lib/auth/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-primary text-white font-body font-medium py-2.5 rounded-lg hover:bg-tertiary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
    </button>
  );
}

interface LoginFormProps {
  redirectTo?: string;
}

const initialState: AuthState = {};

export default function LoginForm({ redirectTo = "/panel" }: LoginFormProps) {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirect" value={redirectTo} />

      {state.error && (
        <div
          role="alert"
          className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg font-body text-sm text-red-700"
        >
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="font-body text-sm font-medium text-on-surface">
          E-posta
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="ornek@eposta.com"
          className="px-3 py-2.5 border border-outline-variant rounded-lg font-body text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="font-body text-sm font-medium text-on-surface">
          Şifre
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="px-3 py-2.5 border border-outline-variant rounded-lg font-body text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
