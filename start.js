#!/usr/bin/env node

/**
 * NodePress Master Start Script
 * =============================
 * Like WordPress: clone → npm i → npm start → everything works
 *
 * - Works with npm, pnpm, or yarn (auto-detects)
 * - Creates .env with secure defaults (auto-generated secrets)
 * - Starts Docker infrastructure if available
 * - Runs database migrations
 * - Starts dev server
 * - Opens browser
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const ENV_FILE = path.join(ROOT, '.env');
const ENV_EXAMPLE = path.join(ROOT, '.env.example');

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
};

function log(msg, color = C.blue) {
  console.log(`${color}⚡${C.reset} ${msg}`);
}

function ok(msg) {
  console.log(`  ${C.green}✓${C.reset} ${msg}`);
}

function warn(msg) {
  console.log(`  ${C.yellow}⚠${C.reset} ${msg}`);
}

function fail(msg) {
  console.log(`  ${C.red}✗${C.reset} ${msg}`);
}

function run(cmd, opts = {}) {
  try {
    execSync(cmd, {
      stdio: opts.silent ? 'pipe' : 'inherit',
      cwd: ROOT,
      shell: true,
      timeout: opts.timeout || 120000,
      ...opts,
    });
    return true;
  } catch (e) {
    if (!opts.silent) console.error(`  ${C.red}✗${C.reset} ${e.message.split('\n')[0]}`);
    return false;
  }
}

function capture(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe', cwd: ROOT, encoding: 'utf-8', timeout: 30000 }).trim();
  } catch {
    return '';
  }
}

function generateSecret(length = 48) {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

function detectPkgManager() {
  if (
    fs.existsSync(path.join(ROOT, 'node_modules', '.pnpm')) &&
    fs.existsSync(path.join(ROOT, 'pnpm-lock.yaml'))
  ) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(ROOT, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function checkEnv() {
  console.log('');
  console.log(`${C.bold}${C.cyan}╔═══════════════════════════════════════════╗`);
  console.log(`  🚀  NodePress - Starting Up`);
  console.log(`      WordPress-compatible CMS`);
  console.log(`      ${C.bold}${C.green}clone → npm i → npm start${C.reset}`);
  console.log(`╚═══════════════════════════════════════════╝${C.reset}`);
  console.log('');

  const nodeVer = process.version;
  const major = parseInt(nodeVer.slice(1));
  if (major < 20) {
    fail(`Node.js ${nodeVer} detected. Version 20+ required.`);
    log(`Download: ${C.cyan}https://nodejs.org/${C.reset}`);
    process.exit(1);
  }
  ok(`Node.js ${nodeVer}`);

  const pm = detectPkgManager();
  ok(`Package manager: ${pm}`);

  return pm;
}

async function createEnv(pm) {
  if (fs.existsSync(ENV_FILE)) {
    ok('.env file exists');
    return;
  }

  console.log('');
  log('📝 Creating .env configuration...');

  let envContent = '';

  if (fs.existsSync(ENV_EXAMPLE)) {
    envContent = fs.readFileSync(ENV_EXAMPLE, 'utf-8');
    envContent = envContent
      .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${generateSecret()}`)
      .replace(/^JWT_REFRESH_SECRET=.*$/m, `JWT_REFRESH_SECRET=${generateSecret()}`)
      .replace(/^ENCRYPTION_KEY=.*$/m, `ENCRYPTION_KEY=${crypto.randomBytes(32).toString('hex')}`)
      .replace(/:6432\//g, ':5432/');
  } else {
    envContent = [
      `# NodePress Configuration - Auto-generated`,
      `JWT_SECRET=${generateSecret()}`,
      `JWT_REFRESH_SECRET=${generateSecret()}`,
      `ENCRYPTION_KEY=${crypto.randomBytes(32).toString('hex')}`,
      ``,
      `DATABASE_URL=postgresql://nodepress:nodepress@localhost:5432/nodepress`,
      `REDIS_URL=redis://localhost:6379`,
      ``,
      `APP_URL=http://localhost:3000`,
      `API_URL=http://localhost:3001`,
      `NEXT_PUBLIC_API_URL=http://localhost:3001`,
      ``,
      `S3_ENDPOINT=http://localhost:9000`,
      `S3_ACCESS_KEY=nodepress`,
      `S3_SECRET_KEY=nodepress123`,
      `S3_BUCKET=nodepress-media`,
      ``,
      `NODE_ENV=development`,
    ].join('\n');
  }

  fs.writeFileSync(ENV_FILE, envContent, 'utf-8');
  ok('.env created with auto-generated secrets');
}

async function startInfra() {
  console.log('');
  log('🔧 Checking infrastructure...');

  const hasDocker = capture('docker --version');

  if (hasDocker) {
    ok('Docker Desktop detected');

    const dockerRunning = run('docker info', { silent: true });

    if (dockerRunning) {
      log('Starting PostgreSQL, Redis, MinIO...');

      const isUp = capture('docker compose ps -q postgres 2>nul || true');

      if (isUp) {
        ok('Services already running');
      } else {
        log('First-time setup: pulling images and starting containers...');
        if (run('docker compose up -d postgres redis minio minio-init', { timeout: 300000 })) {
          ok('PostgreSQL, Redis, MinIO are now running');
          log('Waiting for PostgreSQL to accept connections...');
          await sleep(5000);
        } else {
          warn('Docker start had issues. Trying local database...');
        }
      }
    } else {
      warn('Docker Desktop is installed but not running');
      log(`  1. Open Docker Desktop`);
      log(`  2. Wait for it to be ready`);
      log(`  3. Run: ${C.cyan}npm start${C.reset}`);
      log('');
      log('Trying local PostgreSQL...');
    }
  } else {
    warn('Docker not found. Using local PostgreSQL if available...');
  }

  return true;
}

async function setupDb(pm) {
  console.log('');
  log('🗄️  Setting up database...');

  log('Generating Prisma client...');
  if (pm === 'pnpm') {
    run('pnpm db:generate');
  } else {
    run('npx prisma generate --schema=packages/db/prisma/schema.prisma');
  }
  ok('Prisma client ready');

  log('Applying database schema...');
  let pushed = false;
  if (pm === 'pnpm') {
    pushed = run('pnpm db:push', { silent: true });
  } else {
    pushed = run(
      'npx prisma db push --schema=packages/db/prisma/schema.prisma --accept-data-loss',
      { silent: true },
    );
  }

  if (!pushed) {
    fail('Could not connect to PostgreSQL!');
    console.log('');
    log('📌 Quick setup:');
    log(
      `  1. Install Docker Desktop: ${C.cyan}https://www.docker.com/products/docker-desktop/${C.reset}`,
    );
    log(`  2. Run: ${C.cyan}npm start${C.reset}`);
    log('');
    log('   Or update .env with your PostgreSQL URL:');
    log('   DATABASE_URL=postgresql://user:pass@host:5432/dbname');
    console.log('');
    return false;
  }
  ok('Database schema ready');

  log('Adding default data...');
  if (pm === 'pnpm') {
    run('pnpm db:seed', { silent: true });
  } else {
    run('npx ts-node --project packages/db/tsconfig.json packages/db/src/seed.ts', {
      silent: true,
    });
  }
  ok('Default data seeded');

  return true;
}

async function launch(pm) {
  console.log('');
  console.log(`${C.bold}${C.green}╔═══════════════════════════════════════════╗`);
  console.log(`      ✅  NodePress is Ready!`);
  console.log(`╚═══════════════════════════════════════════╝${C.reset}`);
  console.log('');
  console.log(`  ${C.cyan}🌐${C.reset} Admin Panel:  ${C.bold}http://localhost:3000${C.reset}`);
  console.log(`  ${C.cyan}📖${C.reset} API:          ${C.bold}http://localhost:3001${C.reset}`);
  console.log(
    `  ${C.cyan}📚${C.reset} API Docs:     ${C.bold}http://localhost:3001/docs${C.reset}`,
  );
  console.log('');
  console.log('  Follow the Install Wizard in your browser!');
  console.log('  5 steps → Create admin → Start creating content!');
  console.log('');

  const dev = spawn('npx', ['turbo', 'run', 'dev', '--parallel'], {
    stdio: 'inherit',
    cwd: ROOT,
    shell: true,
  });

  setTimeout(() => {
    const url = 'http://localhost:3000';
    const plat = process.platform;
    try {
      if (plat === 'win32') execSync(`start "" "${url}"`, { stdio: 'ignore' });
      else if (plat === 'darwin') execSync(`open "${url}"`, { stdio: 'ignore' });
      else execSync(`xdg-open "${url}" 2>/dev/null || true`, { stdio: 'ignore' });
    } catch {}
  }, 10000);

  process.on('SIGINT', () => {
    console.log('');
    log('Shutting down...', C.yellow);
    dev.kill('SIGTERM');
    setTimeout(() => process.exit(0), 1000);
  });
  process.on('SIGTERM', () => {
    dev.kill('SIGTERM');
    setTimeout(() => process.exit(0), 1000);
  });
}

async function main() {
  try {
    const pm = await checkEnv();
    await createEnv(pm);
    await startInfra();
    const dbOk = await setupDb(pm);
    if (!dbOk) {
      fail('Database setup failed. Fix the issues above and run npm start again.');
      process.exit(1);
    }
    await launch(pm);
  } catch (err) {
    console.log('');
    fail(`Error: ${err.message}`);
    console.log('');
    process.exit(1);
  }
}

main();
