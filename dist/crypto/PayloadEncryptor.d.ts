export interface EncryptResult {
    ephemeral_public_key: string;
    iv: string;
    auth_tag: string;
}
export declare class PayloadEncryptor {
    /**
     * Create a tar archive (in-memory) from a directory.
     * Paths inside the tar are relative to baseDir.
     */
    static tarDirectory(baseDir: string): Promise<Buffer>;
    /**
     * Encrypt payload tar with AES-256-GCM using ECDH (X25519) derived key via HKDF-SHA256.
     * recipientPublicKeyBase64 is a 32-byte Curve25519 public key, base64 encoded.
     */
    static encryptTar(tarData: Buffer, recipientPublicKeyBase64: string): {
        ciphertext: Buffer;
        result: EncryptResult;
    };
}
//# sourceMappingURL=PayloadEncryptor.d.ts.map