import { NextRequest, NextResponse } from "next/server";
import { safeRelativeReturnPath } from "@/app/chatgpt-auth";
import { logoutUser } from "@/lib/auth-client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawReturnTo = searchParams.get("return_to") || "/demo";
  const returnTo = safeRelativeReturnPath(rawReturnTo);

  const sessionCookie = request.cookies.get("biuroadmin_session")?.value;
  if (sessionCookie) {
    try {
      await logoutUser(sessionCookie);
    } catch {
      // Ignorujemy błędy przy wylogowywaniu
    }
  }

  const targetUrl = new URL(returnTo, request.url);
  const response = NextResponse.redirect(targetUrl);

  // Usuwamy ciasteczko sesyjne
  response.cookies.delete("biuroadmin_session");

  return response;
}
