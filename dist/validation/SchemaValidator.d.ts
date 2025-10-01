export interface SchemaValidatorOptions {
    schemaPath?: string;
    strictMode?: boolean;
}
export declare class SchemaValidator {
    private ajv;
    private schemaPath;
    private schemaCache;
    constructor(options?: SchemaValidatorOptions);
    private loadSchema;
    private getSchemaPath;
    validateManifest(data: unknown): Promise<void>;
    validateMetadata(data: unknown): Promise<void>;
    validateAudit(data: unknown): Promise<void>;
    validateFiles(data: unknown): Promise<void>;
    private validate;
    validateEnvelope(envelope: {
        manifest: unknown;
        metadata: unknown;
        audit: unknown;
        files?: unknown;
    }): Promise<void>;
    isSchemaAvailable(schemaName?: string): Promise<boolean>;
}
//# sourceMappingURL=SchemaValidator.d.ts.map