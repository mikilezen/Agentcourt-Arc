import { SiweMessage } from "siwe";
import { randomBytes } from "crypto";

export function generateNonce(): string {
  return randomBytes(16).toString("hex");
}

export function createSiweMessage(
  address: string,
  chainId: number,
  nonce: string,
  domain: string,
  uri: string
): string {
  const message = new SiweMessage({
    domain,
    address,
    statement: "Sign in to AgentCourt Arc to manage your agents and stakes.",
    uri,
    version: "1",
    chainId,
    nonce,
    issuedAt: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  return message.prepareMessage();
}

export async function verifySiweMessage(
  message: string,
  signature: string
): Promise<{ address: string; chainId: number }> {
  const siweMessage = new SiweMessage(message);
  const result = await siweMessage.verify({ signature });
  if (!result.success) {
    throw new Error("SIWE signature verification failed.");
  }
  return {
    address: result.data.address,
    chainId: result.data.chainId,
  };
}
