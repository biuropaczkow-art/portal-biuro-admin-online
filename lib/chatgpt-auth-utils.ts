export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

export const USER_EMAIL_HEADER = "oai-authenticated-user-email";
export const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
export const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
export const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
export const SIGN_IN_PATH = "/signin-with-chatgpt";
export const SIGN_OUT_PATH = "/signout-with-chatgpt";
export const CALLBACK_PATH = "/callback";

export function parseChatGPTUserFromHeaders(
  headerGetter: (name: string) => string | null | undefined
): ChatGPTUser | null {
  const email = headerGetter(USER_EMAIL_HEADER);
  if (!email) return null;

  const encodedFullName = headerGetter(USER_FULL_NAME_HEADER);
  const encoding = headerGetter(USER_FULL_NAME_ENCODING_HEADER);
  const fullName =
    encodedFullName && encoding === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return {
    displayName: fullName ?? email,
    email,
    fullName,
  };
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function safeRelativeReturnPath(value: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

export function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH
  );
}

export function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
