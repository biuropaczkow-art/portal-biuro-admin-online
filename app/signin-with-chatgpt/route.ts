import { NextRequest, NextResponse } from "next/server";
import { getChatGPTUser, safeRelativeReturnPath } from "@/app/chatgpt-auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawReturnTo = searchParams.get("return_to") || "/demo";
  const returnTo = safeRelativeReturnPath(rawReturnTo);

  const chatGptUser = await getChatGPTUser();
  const email = chatGptUser?.email || "klient.chatgpt@biuroadmin.online";
  const name = chatGptUser?.displayName || "Klient ChatGPT";

  const targetUrl = new URL(returnTo, request.url);
  targetUrl.searchParams.set("auth", "chatgpt");
  targetUrl.searchParams.set("email", email);
  targetUrl.searchParams.set("name", name);

  return NextResponse.redirect(targetUrl);
}
