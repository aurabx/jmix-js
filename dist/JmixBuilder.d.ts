import { SchemaValidator, SchemaValidatorOptions } from './validation/SchemaValidator.js';
import { DicomProcessor } from './dicom/DicomProcessor.js';
import { JmixEnvelope, Config } from './types/index.js';
export interface JmixBuilderOptions {
    schemaValidatorOptions?: SchemaValidatorOptions;
    outputPath?: string;
}
export declare class JmixBuilder {
    private validator;
    private dicomProcessor;
    private outputPath;
    constructor(options?: JmixBuilderOptions);
    /**
     * Build a JMIX envelope from DICOM files and configuration
     */
    buildFromDicom(dicomPath: string, config: Config): Promise<JmixEnvelope>;
    /**
     * Save envelope to JSON files
     */
    saveToFiles(envelope: JmixEnvelope, outputPath?: string): Promise<void>;
    /**
     * Build manifest component
     */
    private buildManifest;
    /**
     * Build metadata component
     */
    private buildMetadata;
    /**
     * Build audit component (audit trail)
     */
    private buildAudit;
    /**
     * Load configuration from JSON file
     */
    static loadConfig(configPath: string): Promise<Config>;
    /**
     * Get the schema validator instance
     */
    getValidator(): SchemaValidator;
    /**
     * Get the DICOM processor instance
     */
    getDicomProcessor(): DicomProcessor;
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
    packageEncryptedToDirectory(dicomPath: string, config: Config, outputRoot: string, recipientPublicKeyBase64: string): Promise<string>;
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
    packageToDirectory(dicomPath: string, config: Config, outputRoot: string): Promise<string>;
    private walkFiles;
    private isLikelyDicom;
    private computePayloadHash;
    /**
     * Decrypt an encrypted JMIX envelope in place: restores a plaintext payload/ directory.
     * - envelopeDir: path to <id>.JMIX directory
     * - recipientPrivateKeyBase64: base64 Curve25519 private key (32 bytes)
     * Returns the extracted payload directory path.
     */
    decryptEnvelope(envelopeDir: string, recipientPrivateKeyBase64: string): Promise<string>;
}
//# sourceMappingURL=JmixBuilder.d.ts.map