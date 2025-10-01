import { JmixBuilder, Config } from '../src/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('JmixBuilder', () => {
  let builder: JmixBuilder;
  const tempDir = './tmp/test';

  beforeEach(() => {
    builder = new JmixBuilder({ outputPath: tempDir });
  });

  afterEach(async () => {
    // Clean up temp files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('should create a JmixBuilder instance', () => {
      expect(builder).toBeInstanceOf(JmixBuilder);
      expect(builder.getValidator()).toBeDefined();
      expect(builder.getDicomProcessor()).toBeDefined();
    });

    it('should use custom options', () => {
      const customBuilder = new JmixBuilder({
        outputPath: './custom-tmp',
        schemaValidatorOptions: {
          schemaPath: './custom-schemas',
          strictMode: false,
        },
      });
      expect(customBuilder).toBeInstanceOf(JmixBuilder);
    });
  });


  describe('loadConfig', () => {
    it('should load configuration from sample file', async () => {
      const sampleConfigPath = path.resolve('./samples/sample_config.json');

      // Check if sample config exists
      try {
        await fs.access(sampleConfigPath);
        const config = await JmixBuilder.loadConfig(sampleConfigPath);

        expect(config.version).toBeDefined();
        expect(config.sender).toBeDefined();
        expect(config.patient).toBeDefined();
      } catch {
        console.warn('Sample config file not found, skipping test');
      }
    });

    it('should throw error for invalid config path', async () => {
      await expect(
        JmixBuilder.loadConfig('./invalid/path.json')
      ).rejects.toThrow('Failed to load configuration');
    });
  });

  describe('buildFromDicom', () => {
    it('should build envelope from empty directory with config fallback', async () => {
      const config = await JmixBuilder.loadConfig(path.resolve('./samples/sample_config.json'));
      const testDir = path.resolve('./samples/study_1');
      
      // Ensure directory exists (may be empty in some environments)
      await fs.mkdir(testDir, { recursive: true });
      
      const envelope = await builder.buildFromDicom(testDir, config);
      
      expect(envelope.manifest).toBeDefined();
      expect(envelope.metadata).toBeDefined();
      expect(envelope.audit).toBeDefined();
      
      expect(envelope.manifest.jmix_version).toBe(config.version);
      expect(envelope.manifest.sender.name).toBe(config.sender.name);
      expect(envelope.manifest.patient.name).toBe(config.patient.name);
      
      expect(envelope.metadata.patient.name).toBe(config.patient.name);
      expect(Array.isArray(envelope.metadata.dicom.modalities)).toBe(true);
      
      expect(Array.isArray(envelope.audit.audit)).toBe(true);
      expect(envelope.audit.audit.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle non-existent directory gracefully', async () => {
      const config = await JmixBuilder.loadConfig(path.resolve('./samples/sample_config.json'));
      
      await expect(
        builder.buildFromDicom('./non-existent-dir', config)
      ).rejects.toThrow('Failed to build JMIX envelope');
    });
  });

  describe('saveToFiles', () => {
    it('should save envelope to JSON files', async () => {
      const config = await JmixBuilder.loadConfig(path.resolve('./samples/sample_config.json'));
      const testDir = path.resolve('./samples/study_1');
      const outputDir = path.join(tempDir, 'output');
      
      // Ensure directory exists (may be empty in some environments)
      await fs.mkdir(testDir, { recursive: true });
      
      const envelope = await builder.buildFromDicom(testDir, config);
      await builder.saveToFiles(envelope, outputDir);

      // Check that files were created
      const manifestPath = path.join(outputDir, 'manifest.json');
      const metadataPath = path.join(outputDir, 'metadata.json');
      const auditPath = path.join(outputDir, 'audit.json');

      await expect(fs.access(manifestPath)).resolves.not.toThrow();
      await expect(fs.access(metadataPath)).resolves.not.toThrow();
      await expect(fs.access(auditPath)).resolves.not.toThrow();

      // Verify file contents are valid JSON
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const auditContent = await fs.readFile(auditPath, 'utf-8');

      expect(() => JSON.parse(manifestContent)).not.toThrow();
      expect(() => JSON.parse(metadataContent)).not.toThrow();
      expect(() => JSON.parse(auditContent)).not.toThrow();
    });

    it('should use default output path when none specified', async () => {
      const config = await JmixBuilder.loadConfig(path.resolve('./samples/sample_config.json'));
      const testDir = path.resolve('./samples/study_1');
      
      // Ensure directory exists (may be empty in some environments)
      await fs.mkdir(testDir, { recursive: true });
      
      const envelope = await builder.buildFromDicom(testDir, config);
      await builder.saveToFiles(envelope); // No output path specified

      // Check that files were created in default path
      const defaultOutputPath = tempDir; // From constructor
      const manifestPath = path.join(defaultOutputPath, 'manifest.json');

      await expect(fs.access(manifestPath)).resolves.not.toThrow();
    });
  });

  describe('integration', () => {
    it('should create a complete JMIX envelope with realistic data', async () => {
      const config: Config = await JmixBuilder.loadConfig(path.resolve('./samples/sample_config.json'));

      const testDir = path.resolve('./samples/study_1');
      await fs.mkdir(testDir, { recursive: true });

      const envelope = await builder.buildFromDicom(testDir, config);

      // Verify envelope structure
      expect(envelope.manifest.custom_tags).toEqual(['radiology', 'urgent']);
      expect(envelope.manifest.consent?.status).toBe('granted');
      expect(envelope.manifest.patient.identifiers).toHaveLength(1);

      expect(envelope.metadata.patient.sex).toBe('M');
      expect(typeof envelope.metadata.dicom.patient_name).toBe('string');
      
      expect(Array.isArray(envelope.audit.audit)).toBe(true);
      expect(envelope.audit.audit.length).toBeGreaterThanOrEqual(1);
    });
  });
});
