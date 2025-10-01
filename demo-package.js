#!/usr/bin/env node

// Demo that packages a JMIX folder including original DICOM files
import { JmixBuilder } from './dist/index.js';

async function main() {
  try {
    const dicomPath = process.argv[2] || './samples/study_1';
    const outputRoot = process.argv[3] || './tmp';

    const config = await JmixBuilder.loadConfig('./samples/sample_config.json');

    const builder = new JmixBuilder({ outputPath: './tmp' });
    console.log('📦 Packaging JMIX folder...');
    const out = await builder.packageToDirectory(dicomPath, config, outputRoot);
    console.log('✅ Package created at:', out);
    console.log('Structure:');
    console.log('  - manifest.json');
    console.log('  - audit.json');
    console.log('  - payload/metadata.json');
    console.log('  - payload/dicom/... (original files)');
  } catch (err) {
    console.error('❌ Packaging failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
