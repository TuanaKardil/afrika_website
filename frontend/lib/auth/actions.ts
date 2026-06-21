"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  message?: string;
  success?: boolean;
};

export async function loginAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirect") as string) || "/panel";

  if (!email || !password) {
    return { error: "E-posta ve şifre gereklidir." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Hatalı e-posta veya şifre. Lütfen tekrar deneyin." };
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function registerAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!email || !password) {
    return { error: "E-posta ve şifre gereklidir." };
  }

  if (password !== confirm) {
    return { error: "Şifreler eşleşmiyor." };
  }

  if (password.length < 6) {
    return { error: "Şifre en az 6 karakter olmalıdır." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "Bu e-posta adresi zaten kayıtlı." };
    }
    return { error: "Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin." };
  }

  return {
    success: true,
    message:
      "Doğrulama e-postası gönderildi. Lütfen e-postanızı kontrol edin.",
  };
}

export async function forgotPasswordAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "E-posta adresi gereklidir." };
  }

  const supabase = createClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.afrikahaberleri.tr";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/sifre-sifirla`,
  });

  if (error) {
    return { error: "E-posta gönderilirken hata oluştu. Lütfen tekrar deneyin." };
  }

  return {
    success: true,
    message:
      "Şifre sıfırlama linki e-postanıza gönderildi. Lütfen e-postanızı kontrol edin.",
  };
}

export async function resetPasswordAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!password) {
    return { error: "Şifre gereklidir." };
  }

  if (password !== confirm) {
    return { error: "Şifreler eşleşmiyor." };
  }

  if (password.length < 6) {
    return { error: "Şifre en az 6 karakter olmalıdır." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "Şifre güncellenirken hata oluştu. Lütfen tekrar deneyin." };
  }

  await supabase.auth.signOut();
  redirect("/giris");
}

export async function logoutAction(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
