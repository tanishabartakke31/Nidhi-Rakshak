export async function deriveKey(password: string): Promise<CryptoKey | null> {
  return null
}

export async function encryptField(plaintext: string, key: CryptoKey | null): Promise<string> {
  return plaintext
}

export async function decryptField(ciphertext: string, key: CryptoKey | null): Promise<string> {
  return ciphertext
}

export function generateRecoveryCodes(): string[] {
  return Array(10).fill('XXXX-XXXX-XXXX')
}
