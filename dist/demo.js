#!/usr/bin/env node

// Demo script to test the JMIX TypeScript library
import { JmixBuilder } from './index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

async function demo() {
  console.log('🚀 JMIX TypeScript Library Demo');
  console.log('================================\n');

  try {
    // Create a JmixBuilder instance
    const builder = new JmixBuilder({
      outputPath: './tmp/demo'
    });

    console.log('✅ JmixBuilder created');

    // Create a sample configuration
    const config = await JmixBuilder.loadConfig('./samples/sample_config.json');
    console.log('✅ Sample configuration created');
    console.log('   Patient:', config.patient.name);
    console.log('   Sender:', config.sender.name);
    console.log('   Security:', config.security.classification);

    // Use sample DICOM directory
    const testDicomPath = './samples/study_1';
    await fs.mkdir(testDicomPath, { recursive: true });
    console.log('✅ Using sample DICOM directory');

    // Build a JMIX envelope
    console.log('\n📦 Building JMIX envelope...');
    const envelope = await builder.buildFromDicom(testDicomPath, config);
    
    console.log('✅ JMIX envelope built successfully!');
    console.log('   Envelope ID:', envelope.manifest.envelope_id);
    console.log('   Audit events:', Array.isArray(envelope.audit?.audit) ? envelope.audit.audit.length : 0);
    console.log('   Patient:', envelope.metadata.patient.name);
    console.log('   DICOM instances:', envelope.metadata.dicom.instance_count);

    // Save to files
    console.log('\n💾 Saving envelope to files...');
    await builder.saveToFiles(envelope);
    
    console.log('✅ Files saved to ./tmp/demo/');

    // List the saved files
    const savedFiles = await fs.readdir('./tmp/demo');
    console.log('   Files created:');
    for (const file of savedFiles.filter(f => f.endsWith('.json'))) {
      const filePath = path.join('./tmp/demo', file);
      const stats = await fs.stat(filePath);
      console.log(`   - ${file} (${Math.round(stats.size / 1024 * 10) / 10} KB)`);
    }

    console.log('\n🎉 Demo completed successfully!');
    console.log('\nTo explore the generated files:');
    console.log('  cat ./tmp/demo/manifest.json | jq .');
    console.log('  cat ./tmp/demo/metadata.json | jq .');
    console.log('  cat ./tmp/demo/audit.json | jq .');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    if (error.cause) {
      console.error('   Cause:', error.cause.message);
    }
    process.exit(1);
  }
}

// Run the demo
demo();