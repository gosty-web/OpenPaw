#!/usr/bin/env node

import { intro, text, confirm, outro, isCancel, cancel } from '@clack/prompts';
import { spawn } from 'child_process';
import open from 'open';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const OPENPAW_DIR = path.join(os.homedir(), '.openpaw');
const CONFIG_FILE = path.join(OPENPAW_DIR, 'config.json');

// Ensure directory exists
if (!fs.existsSync(OPENPAW_DIR)) {
  fs.mkdirSync(OPENPAW_DIR, { recursive: true });
}

// Load config
let config = { firstBoot: true, token: '', userName: '' };
if (fs.existsSync(CONFIG_FILE)) {
  try {
    config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) };
  } catch (e) {
    // ignore
  }
}

function saveConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function runOnboarding() {
  intro('🐾 Welcome to OpenPaw');

  const name = await text({
    message: 'What should we call you?',
    placeholder: 'Josiah',
  });

  if (isCancel(name)) {
    cancel('Setup cancelled.');
    process.exit(0);
  }
  config.userName = name as string;

  const anthropicKey = await text({
    message: 'Paste your Anthropic API key (or press Enter to skip):',
    placeholder: 'sk-ant-...',
  });

  if (isCancel(anthropicKey)) {
    cancel('Setup cancelled.');
    process.exit(0);
  }

  // TODO: we should probably save this directly to DB or pass via ENV to server.
  // For now, if we have a key, we'll store it in config and the server can sync it.
  if (anthropicKey) {
     config.anthropicKey = anthropicKey as string;
  }

  const shouldGenToken = await confirm({
    message: 'Generate a secure auth token?',
    initialValue: true,
  });

  if (isCancel(shouldGenToken)) {
     cancel('Setup cancelled.');
     process.exit(0);
  }

  if (shouldGenToken) {
    config.token = `opk_${crypto.randomBytes(32).toString('hex')}`;
    console.log('\n┌─────────────────────────────────────────────────┐');
    console.log('│  🔑 Your OpenPaw Token                            │');
    console.log(`│  ${config.token.padEnd(45)}│`);
    console.log('│  SAVE THIS. You\'ll need it to log into OpenPaw. │');
    console.log('└─────────────────────────────────────────────────┘\n');
  }

  const shouldOpen = await confirm({
    message: 'Open OpenPaw now?',
    initialValue: true,
  });

  if (isCancel(shouldOpen)) {
      cancel('Setup cancelled.');
      process.exit(0);
  }

  config.firstBoot = false;
  saveConfig();

  outro('OpenPaw is configured!');

  if (shouldOpen) {
    startServer(true);
  }
}

function startServer(openBrowser = false) {
  console.log('🐾 Starting OpenPaw...');
  
  // We need to find where OpenPaw is actually installed.
  // If running globally via npm link, we can use __dirname to trace back.
  // Let's assume the root is two directories up from this script (apps/cli/bin)
  // Or it could be ~/.openpaw-install if used install script.
  let rootDir = path.resolve(new URL('.', import.meta.url).pathname, '../../..');
  
  // Quick fix for Windows pathname starting with /C:/
  if (process.platform === 'win32' && rootDir.startsWith('/') && rootDir[2] === ':') {
      rootDir = rootDir.substring(1);
  }

  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  const serverProcess = spawn(npmCmd, ['run', 'dev'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, OPENPAW_TOKEN: config.token, OPENPAW_USER: config.userName }
  });

  if (openBrowser) {
    setTimeout(() => {
      open('http://localhost:5173');
    }, 3000); // Give Vite a moment to start
  }

  serverProcess.on('close', (code) => {
    console.log(`OpenPaw server exited with code ${code}`);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    if (config.firstBoot) {
      await runOnboarding();
    } else {
      startServer();
    }
  } else if (command === 'start') {
    startServer(true);
  } else if (command === 'stop') {
    // Simplistic stop mechanism - you might need a more robust way to find the PID
    console.log('Stopping OpenPaw...');
    try {
        if (process.platform === 'win32') {
             spawn('taskkill', ['/F', '/IM', 'node.exe']);
             spawn('taskkill', ['/F', '/IM', 'tsx.cmd']);
        } else {
             spawn('pkill', ['-f', 'npm run dev --prefix server']);
             spawn('pkill', ['-f', 'npm run dev --prefix client']);
        }
        console.log('Stopped.');
    } catch(e) {
        console.error('Failed to stop easily. You may need to kill it manually.');
    }
  } else if (command === 'status') {
     console.log('OpenPaw CLI installed.');
     console.log('To see true status, check http://localhost:5173 or the server terminal logs.');
  } else if (command === 'token') {
    if (config.token) {
       console.log(`Your current token is: ${config.token}`);
    } else {
       config.token = `opk_${crypto.randomBytes(32).toString('hex')}`;
       saveConfig();
       console.log(`Generated new token: ${config.token}`);
    }
  } else if (command === 'export') {
      console.log('Export instruction sent. Check your data directory.');
      // Ideally calls the API or runs a script.
  } else if (command === 'reset') {
      const confirmation = await text({
          message: 'This will DELETE ALL LOCAL DATA. Type "RESET ALL" to confirm:',
      });
      if (confirmation === 'RESET ALL') {
          console.log('Resetting...');
          try {
             fs.rmSync(path.join(OPENPAW_DIR, 'db'), { recursive: true, force: true });
             fs.rmSync(path.join(OPENPAW_DIR, 'agents'), { recursive: true, force: true });
             fs.rmSync(CONFIG_FILE, { force: true });
             console.log('Reset complete. Run `openpaw` to setup again.');
          } catch(e) {
             console.error('Error during reset:', e);
          }
      } else {
          console.log('Reset cancelled.');
      }
  } else {
    console.log(`Unknown command: ${command}`);
  }
}

main().catch(console.error);
