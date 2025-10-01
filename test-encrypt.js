import { JmixBuilder } from './dist/index.js';
import nacl from 'tweetnacl';

(async () => {
  const config = await JmixBuilder.loadConfig('./samples/sample_config.json');
  const builder = new JmixBuilder();
  const kp = nacl.box.keyPair();
  const out = await builder.packageEncryptedToDirectory('./samples/study_1', config, './tmp', Buffer.from(kp.publicKey).toString('base64'));
  console.log('RESULT', out);
})().catch(e => { console.error('ERR', e); process.exit(1); });
