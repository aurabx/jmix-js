import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID, createHash } from 'crypto';
import {
  SchemaValidator,
  SchemaValidatorOptions,
} from './validation/SchemaValidator.js';
import { DicomProcessor } from './dicom/DicomProcessor.js';
import { PayloadEncryptor } from './crypto/PayloadEncryptor.js';
import tar from 'tar';
import { PayloadDecryptor } from './crypto/PayloadDecryptor.js';
import {
  JmixEnvelope,
  Config,
  Manifest,
  Metadata,
  Audit,
  AuditEntry,
  JmixError,
} from './types/index.js';

export interface JmixBuilderOptions {
  schemaValidatorOptions?: SchemaValidatorOptions;
  outputPath?: string;
}

export class JmixBuilder {
  private validator: SchemaValidator;
  private dicomProcessor: DicomProcessor;
  private outputPath: string;

  constructor(options: JmixBuilderOptions = {}) {
    this.validator = new SchemaValidator(options.schemaValidatorOptions);
    this.dicomProcessor = new DicomProcessor();
    this.outputPath = options.outputPath || './tmp';
  }

  /**
   * Build a JMIX envelope from DICOM files and configuration
   */
  async buildFromDicom(
    dicomPath: string,
    config: Config
  ): Promise<JmixEnvelope> {
    try {
      // Generate transmission ID and timestamp
      const transmissionId = randomUUID();
      const timestamp = new Date().toISOString();

      // Extract DICOM metadata
      const dicomMetadata = await this.dicomProcessor.processDicomFolder(
        dicomPath,
        config
      );

      // Build envelope components
      const manifest = this.buildManifest(config, timestamp);
      const metadata = this.buildMetadata(config, dicomMetadata);
      const audit = this.buildAudit(
        transmissionId,
        timestamp,
        config
      );

      const envelope: JmixEnvelope = {
        manifest,
        metadata,
        audit,
      };

      // Validate the envelope components
      await this.validator.validateEnvelope({
        manifest,
        metadata,
        audit,
      });

      return envelope;
    } catch (error) {
      throw new JmixError(
        `Failed to build JMIX envelope from ${dicomPath}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Save envelope to JSON files
   */
  async saveToFiles(
    envelope: JmixEnvelope,
    outputPath?: string
  ): Promise<void> {
    const finalOutputPath = outputPath || this.outputPath;

    try {
      // Ensure output directory exists
      await fs.mkdir(finalOutputPath, { recursive: true });

      // Write manifest.json
      await fs.writeFile(
        path.join(finalOutputPath, 'manifest.json'),
        JSON.stringify(envelope.manifest, null, 2),
        'utf-8'
      );

      // Write metadata.json
      await fs.writeFile(
        path.join(finalOutputPath, 'metadata.json'),
        JSON.stringify(envelope.metadata, null, 2),
        'utf-8'
      );

      // Write audit.json (audit trail)
      await fs.writeFile(
        path.join(finalOutputPath, 'audit.json'),
        JSON.stringify(envelope.audit, null, 2),
        'utf-8'
      );

      // Write files.json if present
      if (envelope.files) {
        await fs.writeFile(
          path.join(finalOutputPath, 'files.json'),
          JSON.stringify(envelope.files, null, 2),
          'utf-8'
        );
      }
    } catch (error) {
      throw new JmixError(
        `Failed to save envelope to ${finalOutputPath}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Build manifest component
   */
  private buildManifest(config: Config, timestamp: string): Manifest {
    const manifest: Manifest = {
      jmix_version: config.version,
      envelope_id: randomUUID(),
      created_at: timestamp,
      sender: config.sender,
      receivers: config.receivers,
      patient: config.patient,
      security: config.security,
    };

    // Add optional fields
    if (config.requester) {
      manifest.requester = config.requester;
    }

    if (config.consent) {
      manifest.consent = config.consent;
    }

    if (config.custom_tags) {
      manifest.custom_tags = config.custom_tags;
    }

    if (config.report) {
      manifest.report = config.report;
    }

    if (config.deid_keys) {
      manifest.deid_keys = config.deid_keys;
    }

    return manifest;
  }

  /**
   * Build metadata component
   */
  private buildMetadata(config: Config, dicomMetadata: any): Metadata {
    return {
      patient: config.patient,
      study: {
        description: dicomMetadata.study_description,
        uid: dicomMetadata.study_uid,
        date: dicomMetadata.study_date,
      },
      dicom: dicomMetadata,
      custom_metadata: {},
    };
  }

  /**
   * Build audit component (audit trail)
   */
  private buildAudit(
    transmissionId: string,
    timestamp: string,
    config: Config
  ): Audit {
    const firstReceiver = config.receivers && config.receivers[0];

    const entry: AuditEntry = {
      event: 'envelope_created',
      timestamp,
      by: { id: config.sender.id, name: config.sender.name },
      to: firstReceiver ? { id: firstReceiver.id, name: firstReceiver.name } : undefined,
    };

    const audit: Audit = {
      audit: [entry],
    };

    return audit;
  }

  /**
   * Load configuration from JSON file
   */
  static async loadConfig(configPath: string): Promise<Config> {
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(configContent) as Config;
    } catch (error) {
      throw new JmixError(
        `Failed to load configuration from ${configPath}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }


  /**
   * Get the schema validator instance
   */
  getValidator(): SchemaValidator {
    return this.validator;
  }

  /**
   * Get the DICOM processor instance
   */
  getDicomProcessor(): DicomProcessor {
    return this.dicomProcessor;
  }

  /**
   * Package an ENCRYPTED JMIX envelope directory:
   * - Builds plaintext payload/ first (metadata.json + dicom/)
   * - Computes payload_hash over payload/
   * - Tars payload/, encrypts to payload.encrypted with AES-256-GCM via X25519+HKDF
   * - Removes plaintext payload/ directory
   * Layout:
   *   <outputRoot>/<envelope_id>.JMIX/
   *     manifest.json (includes security.encryption & payload_hash)
   *     audit.json
   *     payload.encrypted
   */
  async packageEncryptedToDirectory(
    dicomPath: string,
    config: Config,
    outputRoot: string,
    recipientPublicKeyBase64: string
  ): Promise<string> {
    // Build the envelope first
    const envelope = await this.buildFromDicom(dicomPath, config);

    const packageRoot = path.resolve(outputRoot, `${envelope.manifest.envelope_id}.JMIX`);
    const payloadDir = path.join(packageRoot, 'payload');
    const dicomOutDir = path.join(payloadDir, 'dicom');

    // Create directory structure and copy DICOM
    await fs.mkdir(dicomOutDir, { recursive: true });

    const allInputFiles = await this.walkFiles(dicomPath);
    for (const absFile of allInputFiles) {
      if (!(await this.isLikelyDicom(absFile))) continue;
      const rel = path.relative(dicomPath, absFile);
      const dest = path.join(dicomOutDir, rel);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(absFile, dest);
    }

    // Write payload/metadata.json
    await fs.mkdir(payloadDir, { recursive: true });
    await fs.writeFile(
      path.join(payloadDir, 'metadata.json'),
      JSON.stringify(envelope.metadata, null, 2),
      'utf-8'
    );

    // Compute payload hash over plaintext payload
    const payloadHash = await this.computePayloadHash(payloadDir);

    // Tar the payload directory to a temporary tar file under the package root
    const tmpTarPath = path.join(packageRoot, 'payload.tmp.tar');
    await tar.c({ cwd: packageRoot, file: tmpTarPath, portable: true, gzip: false }, ['payload']);

    // Read tar and encrypt
    const tarBuf = await fs.readFile(tmpTarPath);
    const { ciphertext, result } = PayloadEncryptor.encryptTar(tarBuf, recipientPublicKeyBase64);
    const encryptedPath = path.join(packageRoot, 'payload.encrypted');
    await fs.writeFile(encryptedPath, ciphertext);

    // Cleanup plaintext tar and payload directory
    await fs.rm(tmpTarPath, { force: true });
    await fs.rm(payloadDir, { recursive: true, force: true });

    // Update manifest security
    envelope.manifest.security = {
      ...envelope.manifest.security,
      payload_hash: payloadHash,
      encryption: {
        algorithm: 'AES-256-GCM',
        ephemeral_public_key: result.ephemeral_public_key,
        iv: result.iv,
        auth_tag: result.auth_tag,
      },
    } as any;

    // Write manifest.json and audit.json
    await fs.mkdir(packageRoot, { recursive: true });
    await fs.writeFile(
      path.join(packageRoot, 'manifest.json'),
      JSON.stringify(envelope.manifest, null, 2),
      'utf-8'
    );
    await fs.writeFile(
      path.join(packageRoot, 'audit.json'),
      JSON.stringify(envelope.audit, null, 2),
      'utf-8'
    );

    return packageRoot;
  }

  /**
   * Package a JMIX envelope to a directory structure that includes original DICOM files.
   * Layout:
   *   <outputRoot>/<envelope_id>.JMIX/
   *     manifest.json
   *     audit.json
   *     payload/
   *       metadata.json
   *       dicom/ ... (copied from dicomPath, preserving structure)
   *       files/ (optional in future)
   *       files.json (optional in future)
   */
  async packageToDirectory(
    dicomPath: string,
    config: Config,
    outputRoot: string
  ): Promise<string> {
    // Build the envelope first
    const envelope = await this.buildFromDicom(dicomPath, config);

    const packageRoot = path.resolve(outputRoot, `${envelope.manifest.envelope_id}.JMIX`);
    const payloadDir = path.join(packageRoot, 'payload');
    const dicomOutDir = path.join(payloadDir, 'dicom');

    // Create directory structure
    await fs.mkdir(dicomOutDir, { recursive: true });

    // Copy DICOM files preserving relative structure
    const allInputFiles = await this.walkFiles(dicomPath);
    for (const absFile of allInputFiles) {
      if (!(await this.isLikelyDicom(absFile))) continue;
      const rel = path.relative(dicomPath, absFile);
      const dest = path.join(dicomOutDir, rel);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(absFile, dest);
    }

    // Write payload/metadata.json
    await fs.mkdir(payloadDir, { recursive: true });
    await fs.writeFile(
      path.join(payloadDir, 'metadata.json'),
      JSON.stringify(envelope.metadata, null, 2),
      'utf-8'
    );

    // Compute payload hash over all files under payload/
    const payloadHash = await this.computePayloadHash(payloadDir);
    envelope.manifest.security = {
      ...envelope.manifest.security,
      payload_hash: payloadHash,
    };

    // Write manifest.json and audit.json at package root
    await fs.writeFile(
      path.join(packageRoot, 'manifest.json'),
      JSON.stringify(envelope.manifest, null, 2),
      'utf-8'
    );
    await fs.writeFile(
      path.join(packageRoot, 'audit.json'),
      JSON.stringify(envelope.audit, null, 2),
      'utf-8'
    );

    return packageRoot;
  }

  // Recursively list all files under a directory (files only)
  private async walkFiles(root: string): Promise<string[]> {
    const out: string[] = [];
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(root, entry.name);
      if (entry.isDirectory()) {
        out.push(...(await this.walkFiles(full)));
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
    return out;
  }

  // Basic DICOM detection: extension or DICM magic at offset 128
  private async isLikelyDicom(filePath: string): Promise<boolean> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.dcm' || ext === '.dicom') return true;

      const fh = await fs.open(filePath, 'r');
      try {
        const buf = Buffer.alloc(4);
        await fh.read(buf, 0, 4, 128);
        return buf.toString('ascii') === 'DICM';
      } finally {
        await fh.close();
      }
    } catch {
      return false;
    }
  }

  // Deterministic payload hash: sha256 over ordered (path + newline + bytes) for all files under payload/
  private async computePayloadHash(payloadDir: string): Promise<string> {
    const all = await this.walkFiles(payloadDir);
    const rels = all
      .map((abs) => ({ abs, rel: path.posix.join(...path.relative(payloadDir, abs).split(path.sep)) }))
      .sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));

    const hash = createHash('sha256');
    for (const f of rels) {
      hash.update(Buffer.from(f.rel + '\n', 'utf-8'));
      const data = await fs.readFile(f.abs);
      hash.update(data);
    }
    const digestHex = hash.digest('hex');
    return `sha256:${digestHex}`;
  }

  /**
   * Decrypt an encrypted JMIX envelope in place: restores a plaintext payload/ directory.
   * - envelopeDir: path to <id>.JMIX directory
   * - recipientPrivateKeyBase64: base64 Curve25519 private key (32 bytes)
   * Returns the extracted payload directory path.
   */
  async decryptEnvelope(
    envelopeDir: string,
    recipientPrivateKeyBase64: string
  ): Promise<string> {
    const manifestPath = path.join(envelopeDir, 'manifest.json');
    const encryptedPath = path.join(envelopeDir, 'payload.encrypted');

    // Read manifest and encryption info
    const manifestRaw = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestRaw);
    const enc = manifest?.security?.encryption;
    if (!enc || !enc.ephemeral_public_key || !enc.iv || !enc.auth_tag) {
      throw new Error('Envelope is not encrypted or missing encryption metadata');
    }

    // Read ciphertext
    const ciphertext = await fs.readFile(encryptedPath);

    // Decrypt to tar buffer
    const tarBuf = PayloadDecryptor.decryptToBuffer(
      ciphertext,
      enc.ephemeral_public_key,
      enc.iv,
      enc.auth_tag,
      recipientPrivateKeyBase64
    );

    // Write tar to temp and extract to payload/
    const tmpTar = path.join(envelopeDir, 'payload.decrypted.tar');
    await fs.writeFile(tmpTar, tarBuf);

    const payloadDir = path.join(envelopeDir, 'payload');
    await fs.mkdir(payloadDir, { recursive: true });
    await tar.x({ cwd: envelopeDir, file: tmpTar });

    // Remove temp tar
    await fs.rm(tmpTar, { force: true });

    // Optional: verify payload hash
    if (manifest?.security?.payload_hash) {
      const computed = await this.computePayloadHash(payloadDir);
      if (computed !== manifest.security.payload_hash) {
        throw new Error(`Payload hash mismatch: expected ${manifest.security.payload_hash} but got ${computed}`);
      }
    }

    return payloadDir;
  }
}
