import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';

const ROOT = process.cwd();
const LAYER_DIR = join(ROOT, 'layers', 'aws-sdk-v2', 'nodejs');
const PKG_JSON = join(LAYER_DIR, 'package.json');

function ensureDirs() {
  if (!existsSync(LAYER_DIR)) mkdirSync(LAYER_DIR, { recursive: true });
}

function ensurePackageJson() {
  if (!existsSync(PKG_JSON)) {
    const pkg = {
      name: 'aws-sdk-v2-layer',
      private: true,
      version: '1.0.0',
      description: 'Layer NB: nodejs/node_modules/aws-sdk for Lambda Node.js 18',
      dependencies: {
        'aws-sdk': '^2.1530.0'
      }
    };
    writeFileSync(PKG_JSON, JSON.stringify(pkg, null, 2), 'utf8');
  }
}

function npmInstall() {
  const env = { ...process.env, npm_config_fund: 'false', npm_config_audit: 'false' };
  console.log('Installing aws-sdk into layer...');
  const cmd = process.platform === 'win32' ? 'cmd' : 'npm';
  const args = process.platform === 'win32' ? ['/c', 'npm', 'install', '--omit=dev'] : ['install', '--omit=dev'];
  execFileSync(cmd, args, {
    cwd: LAYER_DIR,
    stdio: 'inherit',
    env
  });
  console.log('Install finished:', LAYER_DIR);
}

function main() {
  ensureDirs();
  ensurePackageJson();
  npmInstall();
}

main();
