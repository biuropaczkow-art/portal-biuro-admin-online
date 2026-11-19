import { NextRequest, NextResponse } from "next/server";
import { getChatGPTUser, safeRelativeReturnPath } from "@/app/chatgpt-auth";
import { loginUser } from "@/lib/auth-client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawReturnTo = searchParams.get("return_to") || "/demo";
  const returnTo = safeRelativeReturnPath(rawReturnTo);

  const chatGptUser = await getChatGPTUser();
  const email = chatGptUser?.email || searchParams.get("email") || "klient.chatgpt@biuroadmin.online";
  const name = chatGptUser?.displayName || searchParams.get("name") || "Klient ChatGPT";

  // Rejestracja / utworzenie sesji w bazie produkcyjnej PostgreSQL i Redis
  let sessionToken: string | undefined;
  let userRole: string = 'CLIENT';

  try {
    const loginResult = await loginUser({
      provider: "CHATGPT",
      email,
      name,
    });
    if (loginResult.success && loginResult.session) {
      sessionToken = loginResult.session.token;
      userRole = loginResult.user?.role || 'CLIENT';
    }
  } catch (err) {
    console.warn("Nie udało się zarejestrować sesji w bazie PostgreSQL:", err);
  }

  const targetUrl = new URL(returnTo, request.url);
  targetUrl.searchParams.set("auth", "chatgpt");
  targetUrl.searchParams.set("email", email);
  targetUrl.searchParams.set("name", name);
  targetUrl.searchParams.set("role", userRole.toLowerCase());
  if (sessionToken) {
    targetUrl.searchParams.set("token", sessionToken);
  }

  const response = NextResponse.redirect(targetUrl);

  if (sessionToken) {
    response.cookies.set("biuroadmin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 dni
    });
  }

  return response;
}
