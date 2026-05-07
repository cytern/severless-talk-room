import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const pexec = promisify(execFile);

async function main() {
  const profile = process.env.AWS_PROFILE || 'dam';
  const region = process.env.AWS_REGION || 'ap-east-1';
  const env = { ...process.env, AWS_PROFILE: profile, AWS_REGION: region, AWS_PAGER: '' };
  
  let bucket = await getBucketFromStack(env, region);
  if (!bucket) {
    const acct = await getAccount(env, region);
    if (!acct) throw new Error('无法获取账户信息');
    bucket = `hihere-release-${acct}-${region}`;
  }
  
  console.log(`目标桶: ${bucket}`);
  
  // Sync executable files
  const srcRelease = path.join('bin', 'release');
  const destRelease = `s3://${bucket}`;
  console.log(`正在同步 ${srcRelease} 到 ${destRelease}...`);
  await syncDir(srcRelease, destRelease, env);
  
  // Sync doc files
  const srcDoc = path.join('bin', 'release-doc');
  const destDoc = `s3://${bucket}/doc`;
  console.log(`正在同步 ${srcDoc} 到 ${destDoc}...`);
  await syncDir(srcDoc, destDoc, env);
  
  console.log(`已成功同步所有发布文件及文档到 s3://${bucket}`);
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
    const out = outputs.find((o: any) => o.OutputKey === 'ReleaseBucketName');
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
