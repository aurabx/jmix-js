import * as fs from 'fs/promises';
import * as path from 'path';
import { randomBytes, createCipheriv, hkdfSync } from 'crypto';
import nacl from 'tweetnacl';
import tar from 'tar-stream';
import { buffer as consumeBuffer } from 'node:stream/consumers';

export interface EncryptResult {
  ephemeral_public_key: string; // base64
  iv: string; // base64
  auth_tag: string; // base64
}

export class PayloadEncryptor {
  /**
   * Create a tar archive (in-memory) from a directory.
   * Paths inside the tar are relative to baseDir.
   */
  static async tarDirectory(baseDir: string): Promise<Buffer> {
    const pack = tar.pack();

    async function addDir(dir: string, relPrefix = ''): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const abs = path.join(dir, entry.name);
        const rel = path.posix.join(relPrefix, entry.name);
        if (entry.isDirectory()) {
          await addDir(abs, rel);
        } else if (entry.isFile()) {
          const stat = await fs.stat(abs);
          const content = await fs.readFile(abs);
          await new Promise<void>((resolve, reject) => {
            const header = {
              name: rel,
              size: stat.size,
              mode: stat.mode,
              mtime: stat.mtime,
              type: 'file' as const,
            };
            pack.entry(header, content, (err: any) => (err ? reject(err) : resolve()));
          });
        }
      }
    }

    await addDir(baseDir);
    pack.finalize();

    // Collect to Buffer using Node's consumers
    const outBuf = await consumeBuffer(pack as any);
    return Buffer.from(outBuf);
  }

  /**
   * Encrypt payload tar with AES-256-GCM using ECDH (X25519) derived key via HKDF-SHA256.
   * recipientPublicKeyBase64 is a 32-byte Curve25519 public key, base64 encoded.
   */
  static encryptTar(
    tarData: Buffer,
    recipientPublicKeyBase64: string,
  ): { ciphertext: Buffer; result: EncryptResult } {
    const recipientPub = Buffer.from(recipientPublicKeyBase64, 'base64');
    if (recipientPub.length !== 32) {
      throw new Error('Invalid recipient public key length: expected 32 bytes base64');
    }

    // Ephemeral keypair
    const eph = nacl.box.keyPair();

    // X25519 shared secret
    const shared = nacl.scalarMult(eph.secretKey, new Uint8Array(recipientPub));

    // Derive 32-byte AES key with HKDF-SHA256
    const salt = Buffer.alloc(0); // empty salt
    const info = Buffer.from('JMIX-Payload-Encryption');
    const hkdfOut = hkdfSync('sha256', Buffer.from(shared), salt, info, 32);
    const key = Buffer.from(hkdfOut);

    // Encrypt with AES-256-GCM
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const enc1 = cipher.update(tarData);
    const enc2 = cipher.final();
    const auth = cipher.getAuthTag();

    const ciphertext = Buffer.concat([enc1, enc2]);

    return {
      ciphertext,
      result: {
        ephemeral_public_key: Buffer.from(eph.publicKey).toString('base64'),
        iv: iv.toString('base64'),
        auth_tag: auth.toString('base64'),
      },
    };
  }
}
