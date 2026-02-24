import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFileSync } from 'fs';

const pexec = promisify(execFile);

async function main() {
  const profile = process.env.AWS_PROFILE || 'dam';
  const region = process.env.AWS_REGION || 'ap-east-1';
  const env = { ...process.env, AWS_PROFILE: profile, AWS_REGION: region, AWS_PAGER: '' };
  let bucket = await getBucketFromStack(env, region);
  const ws = await getWsFromStack(env, region);
  if (ws) {
    const cfg = `window.HIHERE_CONFIG=${JSON.stringify({ ws_base: ws })};`;
    writeFileSync('web/config.js', cfg, 'utf8');
  }
  if (!bucket) {
    const acct = await getAccount(env, region);
    if (!acct) throw new Error('无法获取账户信息');
    bucket = `hihere-site-${acct}-${region}`;
  }
  console.log(`目标桶: ${bucket}`);
  await syncDir('web', `s3://${bucket}`, env);
  console.log(`已同步到 s3://${bucket}`);
}

async function getBucketFromStack(env: NodeJS.ProcessEnv, region: string) {
  try {
    const { stdout } = await pexec('aws', [
      'cloudformation',
      'describe-stacks',
      '--stack-name',
      'HelloApiStack',
      '--region',
      region,
      '--output',
      'json',
      '--no-cli-pager',
    ], { env, windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
    const data = JSON.parse(stdout);
    const outputs = data?.Stacks?.[0]?.Outputs || [];
    const out = outputs.find((o: any) => o.OutputKey === 'SiteBucketName') || outputs.find((o: any) => String(o.OutputKey || '').includes('SiteBucketName'));
    return out?.OutputValue || '';
  } catch {
    return '';
  }
}

async function getWsFromStack(env: NodeJS.ProcessEnv, region: string) {
  try {
    const { stdout } = await pexec('aws', [
      'cloudformation',
      'describe-stacks',
      '--stack-name',
      'HelloApiStack',
      '--region',
      region,
      '--output',
      'json',
      '--no-cli-pager',
    ], { env, windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
    const data = JSON.parse(stdout);
    const outputs = data?.Stacks?.[0]?.Outputs || [];
    const out = outputs.find((o: any) => o.OutputKey === 'WsBaseUrl') || outputs.find((o: any) => String(o.OutputKey || '').toLowerCase().includes('wsbaseurl'));
    return out?.OutputValue || '';
  } catch {
    return '';
  }
}

async function getAccount(env: NodeJS.ProcessEnv, region: string) {
  try {
    const { stdout } = await pexec('aws', [
      'sts',
      'get-caller-identity',
      '--query',
      'Account',
      '--output',
      'text',
      '--region',
      region,
      '--no-cli-pager',
    ], { env, windowsHide: true });
    return stdout.trim();
  } catch {
    return '';
  }
}

async function syncDir(src: string, dest: string, env: NodeJS.ProcessEnv) {
  await pexec('aws', [
    's3',
    'sync',
    src,
    dest,
    '--delete',
    '--no-cli-pager',
  ], { env, windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
}

main().catch(e => {
  console.error(e?.message || e);
  process.exit(1);
});
