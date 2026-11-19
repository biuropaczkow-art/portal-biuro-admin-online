import assert from "node:assert/strict";
import test from "node:test";
import {
  safeRelativeReturnPath,
  isReservedAuthPath,
  safeDecodeURIComponent,
  chatGPTSignInPath,
  chatGPTSignOutPath,
  parseChatGPTUserFromHeaders,
  USER_EMAIL_HEADER,
  USER_FULL_NAME_HEADER,
  USER_FULL_NAME_ENCODING_HEADER,
  PERCENT_ENCODED_UTF8
} from "../lib/chatgpt-auth-utils.ts";

test("ChatGPT Auth - Bezpieczeństwo ścieżek powrotu (open redirect prevention)", () => {
  // Prawidłowe ścieżki względne
  assert.equal(safeRelativeReturnPath("/demo"), "/demo");
  assert.equal(safeRelativeReturnPath("/demo?tab=ksef"), "/demo?tab=ksef");
  assert.equal(safeRelativeReturnPath("/demo#overview"), "/demo#overview");
  assert.equal(safeRelativeReturnPath("/demo?tab=ksef#hash"), "/demo?tab=ksef#hash");

  // Blokada protocol-relative URLs (np. //attacker.com)
  assert.equal(safeRelativeReturnPath("//attacker.com"), "/");
  assert.equal(safeRelativeReturnPath("//attacker.com/evil"), "/");

  // Blokada zewnętrznych domen bezwzględnych
  assert.equal(safeRelativeReturnPath("https://attacker.com/steal"), "/");
  assert.equal(safeRelativeReturnPath("http://evil.com"), "/");
  assert.equal(safeRelativeReturnPath("javascript:alert(1)"), "/");
  assert.equal(safeRelativeReturnPath("data:text/html,evil"), "/");

  // Blokada pustych lub względnych bez ukośnika
  assert.equal(safeRelativeReturnPath(""), "/");
  assert.equal(safeRelativeReturnPath("demo"), "/");

  // Blokada ścieżek zarezerwowanych (zapobieganie pętlom przekierowań)
  assert.equal(safeRelativeReturnPath("/signin-with-chatgpt"), "/");
  assert.equal(safeRelativeReturnPath("/signout-with-chatgpt"), "/");
  assert.equal(safeRelativeReturnPath("/callback"), "/");
});

test("ChatGPT Auth - Wykrywanie zarezerwowanych ścieżek", () => {
  assert.equal(isReservedAuthPath("/signin-with-chatgpt"), true);
  assert.equal(isReservedAuthPath("/signout-with-chatgpt"), true);
  assert.equal(isReservedAuthPath("/callback"), true);
  assert.equal(isReservedAuthPath("/demo"), false);
  assert.equal(isReservedAuthPath("/"), false);
});

test("ChatGPT Auth - Bezpieczne dekodowanie UTF-8 dla nagłówków OpenAI", () => {
  // Prawidłowe polskie znaki w percent-encoding
  const encodedName = encodeURIComponent("Jarosław Konik");
  assert.equal(safeDecodeURIComponent(encodedName), "Jarosław Konik");

  const simple = "Jan Kowalski";
  assert.equal(safeDecodeURIComponent(simple), "Jan Kowalski");

  // Błędny format URI - nie powinien rzucać wyjątku tylko zwrócić null
  assert.equal(safeDecodeURIComponent("%E0%A4%A"), null);
});

test("ChatGPT Auth - Parsowanie użytkownika z nagłówków proxy OpenAI", () => {
  const headersMap = {
    [USER_EMAIL_HEADER]: "klient@example.pl",
    [USER_FULL_NAME_HEADER]: encodeURIComponent("Jarosław Konik"),
    [USER_FULL_NAME_ENCODING_HEADER]: PERCENT_ENCODED_UTF8
  };

  const user = parseChatGPTUserFromHeaders((name) => headersMap[name]);
  assert.notEqual(user, null);
  assert.equal(user.email, "klient@example.pl");
  assert.equal(user.displayName, "Jarosław Konik");
  assert.equal(user.fullName, "Jarosław Konik");

  // Brak nagłówka e-mail = brak uwierzytelnienia
  const emptyUser = parseChatGPTUserFromHeaders(() => null);
  assert.equal(emptyUser, null);
});

test("ChatGPT Auth - Generowanie ścieżek logowania i wylogowania", () => {
  assert.equal(
    chatGPTSignInPath("/demo?tab=documents"),
    "/signin-with-chatgpt?return_to=%2Fdemo%3Ftab%3Ddocuments"
  );
  assert.equal(
    chatGPTSignOutPath("/"),
    "/signout-with-chatgpt?return_to=%2F"
  );
});
