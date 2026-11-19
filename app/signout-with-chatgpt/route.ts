import { NextRequest, NextResponse } from "next/server";
import { safeRelativeReturnPath } from "@/app/chatgpt-auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawReturnTo = searchParams.get("return_to") || "/";
  const returnTo = safeRelativeReturnPath(rawReturnTo);

  const targetUrl = new URL(returnTo, request.url);
  return NextResponse.redirect(targetUrl);
}
