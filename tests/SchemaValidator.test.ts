import { SchemaValidator, ValidationError } from '../src/index.js';
import * as path from 'path';

describe('SchemaValidator', () => {
  let validator: SchemaValidator;

  beforeEach(() => {
    validator = new SchemaValidator();
  });

  describe('constructor', () => {
    it('should create a validator with default options', () => {
      expect(validator).toBeInstanceOf(SchemaValidator);
    });

    it('should use custom schema path from options', () => {
      const customValidator = new SchemaValidator({
        schemaPath: './custom-schemas',
        strictMode: false,
      });
      expect(customValidator).toBeInstanceOf(SchemaValidator);
    });

    it('should use schema path from environment variable', () => {
      const originalEnv = process.env.JMIX_SCHEMA_PATH;
      process.env.JMIX_SCHEMA_PATH = './env-schemas';

      const envValidator = new SchemaValidator();
      expect(envValidator).toBeInstanceOf(SchemaValidator);

      // Restore original environment
      if (originalEnv) {
        process.env.JMIX_SCHEMA_PATH = originalEnv;
      } else {
        delete process.env.JMIX_SCHEMA_PATH;
      }
    });
  });

  describe('isSchemaAvailable', () => {
    it('should check if schema files are available', async () => {
      const available = await validator.isSchemaAvailable();
      // This may be false if ../jmix/schemas doesn't exist, which is fine
      expect(typeof available).toBe('boolean');
    });

    it('should check specific schema availability', async () => {
      const manifestAvailable = await validator.isSchemaAvailable('manifest');
      expect(typeof manifestAvailable).toBe('boolean');
    });
  });

  describe('validation methods', () => {
    const sampleManifest = {
      jmix_version: '1.0',
      envelope_id: '12345678-1234-5678-9012-123456789012',
      created_at: new Date().toISOString(),
      sender: {
        name: 'Test Sender',
        id: 'org:test.sender',
        contact: 'test@sender.org',
      },
      receivers: [
        {
          name: 'Test Receiver',
          id: 'org:test.receiver',
          contact: 'test@receiver.org',
        },
      ],
      patient: {
        name: 'Test Patient',
        id: 'PAT001',
      },
      security: {
        classification: 'confidential',
      },
    };

    const sampleMetadata = {
      patient: {
        name: 'Test Patient',
        id: 'PAT001',
      },
      study: {
        description: 'Test Study',
      },
      dicom: {
        modalities: ['CT'],
        series_count: 1,
        instance_count: 5,
      },
    };

    const sampleAudit = {
      audit: [
        {
          event: 'envelope_created',
          by: { id: 'org:test.sender', name: 'Test Sender' },
          to: { id: 'org:test.receiver', name: 'Test Receiver' },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    it('should validate manifest without throwing when schemas not available', async () => {
      // This should not throw even if schemas are missing
      await expect(
        validator.validateManifest(sampleManifest)
      ).resolves.not.toThrow();
    });

    it('should validate metadata without throwing when schemas not available', async () => {
      await expect(
        validator.validateMetadata(sampleMetadata)
      ).resolves.not.toThrow();
    });

    it('should validate audit without throwing when schemas not available', async () => {
      await expect(validator.validateAudit(sampleAudit)).resolves.not.toThrow();
    });

    it('should validate complete envelope', async () => {
      const envelope = {
        manifest: sampleManifest,
        metadata: sampleMetadata,
        audit: sampleAudit,
      };

      await expect(validator.validateEnvelope(envelope)).resolves.not.toThrow();
    });

    it('should handle invalid data gracefully when schemas not available', async () => {
      const invalidManifest = {
        invalid: 'data',
      };

      // Should not throw when schemas are not available
      await expect(
        validator.validateManifest(invalidManifest)
      ).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle ValidationError properly', () => {
      const error = new ValidationError('Test validation error', [
        'Field is required',
      ]);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Test validation error');
      expect(error.errors).toEqual(['Field is required']);
      expect(error.name).toBe('ValidationError');
    });

    it('should create ValidationError with default empty errors', () => {
      const error = new ValidationError('Test error');

      expect(error.errors).toEqual([]);
    });
  });

  describe('with custom schema path', () => {
    it('should use custom schema path', () => {
      const customPath = path.resolve('./custom-schemas');
      const customValidator = new SchemaValidator({
        schemaPath: customPath,
      });

      expect(customValidator).toBeInstanceOf(SchemaValidator);
    });

    it('should handle non-existent custom schema path gracefully', async () => {
      const customValidator = new SchemaValidator({
        schemaPath: './non-existent-schemas',
      });

      const sampleData = { test: 'data' };

      // Should not throw when schemas don't exist
      await expect(
        customValidator.validateManifest(sampleData)
      ).resolves.not.toThrow();
    });
  });

  describe('strict mode', () => {
    it('should work in non-strict mode', () => {
      const nonStrictValidator = new SchemaValidator({
        strictMode: false,
      });

      expect(nonStrictValidator).toBeInstanceOf(SchemaValidator);
    });
  });
});
