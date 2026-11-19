import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ChatGPTUser,
  chatGPTSignInPath,
  parseChatGPTUserFromHeaders,
} from "@/lib/chatgpt-auth-utils";

export * from "@/lib/chatgpt-auth-utils";

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  return parseChatGPTUserFromHeaders((name) => requestHeaders.get(name));
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}
