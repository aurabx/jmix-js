export declare class PayloadDecryptor {
    /**
     * Decrypt AES-256-GCM ciphertext using X25519 + HKDF-SHA256 key derivation.
     * - ephPubB64: base64 sender ephemeral public key (32 bytes)
     * - ivB64: base64 12-byte IV
     * - tagB64: base64 16-byte auth tag
     * - recipientPrivB64: base64 32-byte recipient private key
     * Returns plaintext Buffer (tar data).
     */
    static decryptToBuffer(ciphertext: Buffer, ephPubB64: string, ivB64: string, tagB64: string, recipientPrivB64: string): Buffer;
}
//# sourceMappingURL=PayloadDecryptor.d.ts.map