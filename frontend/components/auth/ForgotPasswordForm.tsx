/// <reference types="react-dom/canary" />
"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { forgotPasswordAction, type AuthState } from "@/lib/auth/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-primary text-white font-body font-medium py-2.5 rounded-lg hover:bg-tertiary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Gonderiliyor..." : "Sifirlama Linki Gonder"}
    </button>
  );
}

const initialState: AuthState = {};

export default function ForgotPasswordForm() {
  const [state, formAction] = useFormState(forgotPasswordAction, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col gap-4">
        <div
          role="status"
          className="px-4 py-4 bg-green-50 border border-green-200 rounded-lg font-body text-sm text-green-800 leading-relaxed"
        >
          {state.message}
        </div>
        <Link
          href="/giris"
          className="text-center font-body text-sm text-primary hover:text-tertiary transition-colors"
        >
          Giris sayfasina don
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
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

      <SubmitButton />
    </form>
  );
}
