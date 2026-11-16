import { randomToken, sha256Base64Url } from "./encoding";

export interface PkcePair {
  verifier: string;
  challenge: string;
  method: "S256";
}

export async function createPkcePair(): Promise<PkcePair> {
  const verifier = randomToken(48);
  return {
    verifier,
    challenge: await sha256Base64Url(verifier),
    method: "S256",
  };
}
