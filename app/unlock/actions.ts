"use server";

import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_VALUE,
  normalizeNextPath,
} from "@/lib/auth/session";

export async function unlockApp(formData: FormData) {
  const password = process.env.APP_PASSWORD;
  const submittedPassword = String(formData.get("password") ?? "");
  const nextPath = normalizeNextPath(String(formData.get("next") ?? "/"));

  if (!password) {
    redirect(nextPath as Route);
  }

  if (submittedPassword !== password) {
    redirect(
      `/unlock?error=invalid&next=${encodeURIComponent(nextPath)}` as Route,
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "strict",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(nextPath as Route);
}
