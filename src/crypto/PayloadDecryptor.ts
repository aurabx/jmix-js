import { createDecipheriv, hkdfSync } from 'crypto';
import nacl from 'tweetnacl';

export class PayloadDecryptor {
  /**
   * Decrypt AES-256-GCM ciphertext using X25519 + HKDF-SHA256 key derivation.
   * - ephPubB64: base64 sender ephemeral public key (32 bytes)
   * - ivB64: base64 12-byte IV
   * - tagB64: base64 16-byte auth tag
   * - recipientPrivB64: base64 32-byte recipient private key
   * Returns plaintext Buffer (tar data).
   */
  static decryptToBuffer(
    ciphertext: Buffer,
    ephPubB64: string,
    ivB64: string,
    tagB64: string,
    recipientPrivB64: string,
  ): Buffer {
    const ephPub = Buffer.from(ephPubB64, 'base64');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const recipPriv = Buffer.from(recipientPrivB64, 'base64');

    if (ephPub.length !== 32) throw new Error('Invalid ephemeral public key');
    if (recipPriv.length !== 32) throw new Error('Invalid recipient private key');
    if (iv.length !== 12) throw new Error('Invalid IV length (expected 12)');
    if (tag.length !== 16) throw new Error('Invalid auth tag length (expected 16)');

    // X25519 shared secret
    const shared = nacl.scalarMult(new Uint8Array(recipPriv), new Uint8Array(ephPub));

    // Derive 32-byte AES key with HKDF-SHA256
    const salt = Buffer.alloc(0);
    const info = Buffer.from('JMIX-Payload-Encryption');
    const hkdfOut = hkdfSync('sha256', Buffer.from(shared), salt, info, 32);
    const key = Buffer.from(hkdfOut);

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const dec1 = decipher.update(ciphertext);
    const dec2 = decipher.final();
    return Buffer.concat([dec1, dec2]);
  }
}