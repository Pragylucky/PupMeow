/** Safe login errors — never show arbitrary text from ?error= in the URL. */
const MESSAGES: Record<string, string> = {
  auth_failed: "That sign-in link has expired or was opened in a different browser. Please try Continue with Google again.",
  oauth_denied: "Google sign-in was cancelled or denied. Please try again.",
  link_expired: "That sign-in link has expired. Please try again.",
};

export function loginErrorMessage(code: string | undefined): string | undefined {
  if (!code?.trim()) return undefined;
  const key = code.trim().toLowerCase();
  if (MESSAGES[key]) return MESSAGES[key];
  return "Sign-in didn't work. Please try Continue with Google again.";
}
