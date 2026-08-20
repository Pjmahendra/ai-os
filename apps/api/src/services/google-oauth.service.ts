import { google } from "googleapis";
import { env } from "@ai-os/config";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose"
];

function getOAuthClient() {
  if (
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET ||
    !env.GOOGLE_REDIRECT_URI
  ) {
    throw new Error(
      "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI are required for Gmail integration."
    );
  }

  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(state: string): string {
  const client = getOAuthClient();

  return client.generateAuthUrl({
    // Force both every time: access_type "offline" is what makes
    // Google issue a refresh_token at all, and without prompt
    // "consent" Google silently omits the refresh_token on a repeat
    // consent (e.g. disconnect + reconnect) since it assumes one is
    // already on file.
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
    state
  });
}

export interface GoogleTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiryDate: number;
  readonly scope: string;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<GoogleTokens> {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Disconnect any prior grant for this app in your Google Account's third-party access settings, then reconnect."
    );
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date ?? Date.now() + 3600_000,
    scope: tokens.scope ?? GMAIL_SCOPES.join(" ")
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiryDate: number }> {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error(
      "Google did not return a new access token on refresh."
    );
  }

  return {
    accessToken: credentials.access_token,
    expiryDate: credentials.expiry_date ?? Date.now() + 3600_000
  };
}
