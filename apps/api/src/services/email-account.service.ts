import { prisma } from "../database/prisma.js";
import { encrypt, decrypt } from "./crypto.service.js";
import {
  refreshAccessToken,
  type GoogleTokens
} from "./google-oauth.service.js";

// v1 supports one connected Gmail account per user - a deliberate
// simplification, not an oversight. Multi-account support would need
// the email/thread/draft endpoints to take an explicit accountId.
export async function getAccountForUser(
  userId: string
) {
  return prisma.emailAccount.findFirst({
    where: { userId },
    orderBy: { connectedAt: "desc" }
  });
}

export async function connectAccount(
  userId: string,
  email: string,
  tokens: GoogleTokens
) {
  return prisma.emailAccount.upsert({
    where: {
      userId_email: { userId, email }
    },
    create: {
      userId,
      email,
      encryptedAccessToken: encrypt(tokens.accessToken),
      encryptedRefreshToken: encrypt(tokens.refreshToken),
      tokenExpiresAt: new Date(tokens.expiryDate),
      scopes: tokens.scope
    },
    update: {
      encryptedAccessToken: encrypt(tokens.accessToken),
      encryptedRefreshToken: encrypt(tokens.refreshToken),
      tokenExpiresAt: new Date(tokens.expiryDate),
      scopes: tokens.scope
    }
  });
}

export async function disconnectAccount(
  userId: string,
  accountId: string
) {
  return prisma.emailAccount.deleteMany({
    where: {
      id: accountId,
      userId
    }
  });
}

// The single choke point every Gmail API call goes through - refreshes
// the stored access token if it's expired/near-expiry, persists the
// new one, and returns a token that's actually usable right now.
const EXPIRY_BUFFER_MS = 60_000;

export async function getValidAccessToken(
  userId: string
): Promise<string> {
  const account = await getAccountForUser(userId);

  if (!account) {
    throw new Error(
      "No Gmail account connected for this user."
    );
  }

  const expiresAt = account.tokenExpiresAt.getTime();

  if (expiresAt - EXPIRY_BUFFER_MS > Date.now()) {
    return decrypt(account.encryptedAccessToken);
  }

  const refreshToken = decrypt(account.encryptedRefreshToken);
  const refreshed = await refreshAccessToken(refreshToken);

  await prisma.emailAccount.update({
    where: { id: account.id },
    data: {
      encryptedAccessToken: encrypt(refreshed.accessToken),
      tokenExpiresAt: new Date(refreshed.expiryDate)
    }
  });

  return refreshed.accessToken;
}
