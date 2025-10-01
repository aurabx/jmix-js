import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ValidationError } from '../types/index.js';
export class SchemaValidator {
    ajv;
    schemaPath;
    schemaCache = new Map();
    constructor(options = {}) {
        this.schemaPath =
            options.schemaPath ||
                process.env.JMIX_SCHEMA_PATH ||
                path.resolve(process.cwd(), '../jmix/schemas');
        this.ajv = new Ajv({
            allErrors: true,
            strict: options.strictMode ?? true,
            loadSchema: this.loadSchema.bind(this),
        });
        addFormats(this.ajv);
    }
    async loadSchema(uri) {
        if (this.schemaCache.has(uri)) {
            return this.schemaCache.get(uri);
        }
        try {
            const schemaContent = await fs.readFile(uri, 'utf-8');
            const schema = JSON.parse(schemaContent);
            this.schemaCache.set(uri, schema);
            return schema;
        }
        catch (error) {
            throw new ValidationError(`Failed to load schema from ${uri}`, [
                error instanceof Error ? error.message : String(error),
            ]);
        }
    }
    getSchemaPath(schemaName) {
        return path.join(this.schemaPath, `${schemaName}.schema.json`);
    }
    async validateManifest(data) {
        await this.validate('manifest', data);
    }
    async validateMetadata(data) {
        await this.validate('metadata', data);
    }
    async validateAudit(data) {
        await this.validate('audit', data);
    }
    async validateFiles(data) {
        await this.validate('files', data);
    }
    async validate(schemaName, data) {
        const schemaPath = this.getSchemaPath(schemaName);
        try {
            // Check if schema file exists
            await fs.access(schemaPath);
        }
        catch {
            // Schema file doesn't exist, skip validation gracefully
            console.warn(`Schema validation skipped: ${schemaPath} not found`);
            return;
        }
        try {
            const schema = await this.loadSchema(schemaPath);
            const validate = this.ajv.compile(schema);
            const valid = validate(data);
            if (!valid) {
                const errors = validate.errors?.map((error) => {
                    const instancePath = error.instancePath || 'root';
                    return `${instancePath}: ${error.message}`;
                }) || [];
                throw new ValidationError(`${schemaName} validation failed`, errors);
            }
        }
        catch (error) {
            if (error instanceof ValidationError &&
                error.message.includes('validation failed')) {
                throw error;
            }
            // For schema loading errors, just skip validation gracefully
            console.warn(`Schema validation error for ${schemaName}, skipping: ${error instanceof Error ? error.message : String(error)}`);
            return;
        }
    }
    async validateEnvelope(envelope) {
        const validationPromises = [
            this.validateManifest(envelope.manifest),
            this.validateMetadata(envelope.metadata),
            this.validateAudit(envelope.audit),
        ];
        if (envelope.files) {
            validationPromises.push(this.validateFiles(envelope.files));
        }
        try {
            await Promise.all(validationPromises);
        }
        catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new ValidationError('Envelope validation failed', [
                error instanceof Error ? error.message : String(error),
            ]);
        }
    }
    // Check if schema files are available
    async isSchemaAvailable(schemaName) {
        if (schemaName) {
            try {
                await fs.access(this.getSchemaPath(schemaName));
                return true;
            }
            catch {
                return false;
            }
        }
        // Check if any schema files are available
        const schemaNames = ['manifest', 'metadata', 'audit', 'files'];
        const checks = schemaNames.map((name) => this.isSchemaAvailable(name));
        const results = await Promise.all(checks);
        return results.some((available) => available);
    }
}
//# sourceMappingURL=SchemaValidator.js.map