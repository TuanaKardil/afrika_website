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
    return { error: "E-posta ve sifre gereklidir." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Hatali e-posta veya sifre. Lutfen tekrar deneyin." };
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
    return { error: "E-posta ve sifre gereklidir." };
  }

  if (password !== confirm) {
    return { error: "Sifreler eslesmıyor." };
  }

  if (password.length < 6) {
    return { error: "Sifre en az 6 karakter olmalidir." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "Bu e-posta adresi zaten kayitli." };
    }
    return { error: "Kayit sirasinda bir hata olustu. Lutfen tekrar deneyin." };
  }

  return {
    success: true,
    message:
      "Dogrulama e-postasi gonderildi. Lutfen e-postanizi kontrol edin.",
  };
}

export async function logoutAction(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
