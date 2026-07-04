#!/usr/bin/env node

/**
 * NodePress Master Start Script
 * =============================
 * Clone → npm i → npm start → everything works
 *
 * - Detects if NOT installed → redirects to Install Wizard
 * - Works with npm, pnpm, or yarn (auto-detects)
 * - Creates .env with secure defaults (auto-generated secrets)
 * - Starts Docker infrastructure if available
 * - Runs database migrations if needed
 * - Starts dev server
 * - Opens browser to Install Wizard (if not installed) or Admin (if installed)
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

const ROOT = __dirname;
const ENV_FILE = path.join(ROOT, '.env');
const ENV_EXAMPLE = path.join(ROOT, '.env.example');
const CONFIG_DIR = path.join(ROOT, 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'nodepress.config.json');

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

function capture(cmd, timeout = 30000) {
  try {
    return execSync(cmd, { stdio: 'pipe', cwd: ROOT, encoding: 'utf-8', timeout }).trim();
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

/**
 * Check if NodePress is installed by looking at the config file
 * and verifying JWT_SECRET is not the placeholder value.
 */
function isInstalled() {
  // Check 1: Config file exists with installed flag
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      if (config.installed === true) return true;
    } catch {}
  }

  // Check 2: .env has a valid JWT_SECRET (not placeholder)
  if (fs.existsSync(ENV_FILE)) {
    const envContent = fs.readFileSync(ENV_FILE, 'utf-8');
    const jwtMatch = envContent.match(/^JWT_SECRET=(.+)$/m);
    if (jwtMatch) {
      const secret = jwtMatch[1].trim();
      // Check it's not the placeholder or empty
      if (secret && secret !== 'change-me-in-production' && secret !== '') {
        // Check 3: Also verify the config file exists (double-check)
        // Config file gets written by the install wizard
        return false; // env has a secret but no config = wizard was started but not completed
      }
    }
  }

  return false;
}

/**
 * Check if JWT_SECRET is a placeholder (not real secret)
 */
function hasValidSecrets() {
  if (!fs.existsSync(ENV_FILE)) return false;

  const envContent = fs.readFileSync(ENV_FILE, 'utf-8');
  const jwtMatch = envContent.match(/^JWT_SECRET=(.+)$/m);
  if (!jwtMatch) return false;

  const secret = jwtMatch[1].trim();
  return secret !== '' && secret !== 'change-me-in-production' && secret.length >= 20;
}

/**
 * Wait for a URL to respond with a successful status code
 */
function waitForUrl(url, maxRetries = 30, interval = 2000) {
  return new Promise((resolve) => {
    let retries = 0;

    const check = () => {
      retries++;
      const parsedUrl = new URL(url);

      const req = http.get(url, { timeout: 3000 }, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve(true);
        } else if (retries < maxRetries) {
          setTimeout(check, interval);
        } else {
          resolve(false);
        }
        res.resume();
      });

      req.on('error', () => {
        if (retries < maxRetries) {
          setTimeout(check, interval);
        } else {
          resolve(false);
        }
      });

      req.setTimeout(3000, () => {
        req.destroy();
        if (retries < maxRetries) {
          setTimeout(check, interval);
        } else {
          resolve(false);
        }
      });
    };

    check();
  });
}

/**
 * Open browser to a URL
 */
function openBrowser(url) {
  try {
    const plat = process.platform;
    if (plat === 'win32') execSync(`start "" "${url}"`, { stdio: 'ignore' });
    else if (plat === 'darwin') execSync(`open "${url}"`, { stdio: 'ignore' });
    else execSync(`xdg-open "${url}" 2>/dev/null || true`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function checkEnv() {
  console.log('');
  console.log(`${C.bold}${C.cyan}╔═══════════════════════════════════════════╗`);
  console.log(`  🚀  NodePress - Starting Up`);
  console.log(`      Modern CMS`);
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

  // Check install status
  const installed = isInstalled();
  if (installed) {
    ok('NodePress is already installed');
  } else {
    warn('NodePress is not installed yet');
    log('The Install Wizard will open in your browser.', C.yellow);
  }

  return { pm, installed };
}

async function createEnv(pm) {
  if (fs.existsSync(ENV_FILE)) {
    // Check if secrets are valid
    if (!hasValidSecrets()) {
      warn('.env exists but secrets are placeholders — regenerating...');
      regenerateSecrets();
      ok('.env secrets regenerated');
    } else {
      ok('.env file exists');
    }
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

function regenerateSecrets() {
  if (!fs.existsSync(ENV_FILE)) return;
  let content = fs.readFileSync(ENV_FILE, 'utf-8');
  content = content
    .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${generateSecret()}`)
    .replace(/^JWT_REFRESH_SECRET=.*$/m, `JWT_REFRESH_SECRET=${generateSecret()}`)
    .replace(/^ENCRYPTION_KEY=.*$/m, `ENCRYPTION_KEY=${crypto.randomBytes(32).toString('hex')}`);
  fs.writeFileSync(ENV_FILE, content, 'utf-8');
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

function getRunCmd(pm) {
  return pm === 'pnpm' ? 'pnpm' : 'npm run';
}

async function setupDb(pm) {
  console.log('');
  log('🗄️  Setting up database...');

  const cmd = getRunCmd(pm);

  log('Generating Prisma client...');
  run(`${cmd} db:generate`);
  ok('Prisma client ready');

  log('Applying database schema...');
  let pushed = run(`${cmd} db:push`, { silent: true });

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

  // Only seed if this is a fresh install (no config file)
  if (!isInstalled()) {
    log('Adding default data...');
    run(`${cmd} db:seed`, { silent: true });
    ok('Default data seeded');
  } else {
    ok('Skipping seed (already installed)');
  }

  return true;
}

async function launch(pm, installed) {
  console.log('');
  if (installed) {
    console.log(`${C.bold}${C.green}╔═══════════════════════════════════════════╗`);
    console.log(`      ✅  NodePress is Ready!`);
    console.log(`╚═══════════════════════════════════════════╝${C.reset}`);
  } else {
    console.log(`${C.bold}${C.yellow}╔═══════════════════════════════════════════╗`);
    console.log(`      🚀  NodePress - First Launch`);
    console.log(`      Complete setup in your browser!`);
    console.log(`╚═══════════════════════════════════════════╝${C.reset}`);
  }
  console.log('');
  console.log(`  ${C.cyan}🌐${C.reset} Admin Panel:  ${C.bold}http://localhost:3000${C.reset}`);
  console.log(`  ${C.cyan}📖${C.reset} API:          ${C.bold}http://localhost:3001${C.reset}`);
  console.log(
    `  ${C.cyan}📚${C.reset} API Docs:     ${C.bold}http://localhost:3001/docs${C.reset}`,
  );
  console.log('');

  if (!installed) {
    console.log('  ⏳ Starting dev server...');
    console.log('  The Install Wizard will open automatically when ready.');
    console.log('');
  }

  // Start the dev server
  const dev = spawn('npx', ['turbo', 'run', 'dev', '--parallel'], {
    stdio: 'inherit',
    cwd: ROOT,
    shell: true,
  });

  // Wait for the admin server to be ready, then open browser
  if (!installed) {
    log('Waiting for server to be ready...', C.yellow);
    const ready = await waitForUrl('http://localhost:3000', 60, 2000);

    if (ready) {
      ok('Server is ready!');

      // Open the install wizard
      const installUrl = 'http://localhost:3000/install';
      log(`Opening Install Wizard...`);
      openBrowser(installUrl);
      console.log('');
      console.log(`  ${C.bold}${C.cyan}📋${C.reset} Follow the 5-step Install Wizard:`);
      console.log(`     1. Database connection  (click "Test Connection")`);
      console.log(`     2. Create admin account (email + password)`);
      console.log(`     3. Site settings        (name your site)`);
      console.log(`     4. Choose plugins       (SEO, Comments, Security...)`);
      console.log(`     5. Done!                (start creating!)`);
      console.log('');
    } else {
      warn('Server did not become ready in time.');
      warn(`Open manually: ${C.cyan}http://localhost:3000${C.reset}`);
    }
  } else {
    // Already installed, open admin after a short delay
    setTimeout(() => {
      const url = 'http://localhost:3000/admin';
      ok(`Opening ${url}`);
      openBrowser(url);
    }, 8000);
  }

  // Handle shutdown signals
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
    const { pm, installed } = await checkEnv();
    await createEnv(pm);
    await startInfra();
    const dbOk = await setupDb(pm);
    if (!dbOk) {
      fail('Database setup failed. Fix the issues above and run npm start again.');
      console.log('');
      console.log(
        `  ${C.yellow}💡${C.reset} Tip: Run ${C.cyan}node scripts/quick-install.js${C.reset} for guided setup.`,
      );
      process.exit(1);
    }
    await launch(pm, installed);
  } catch (err) {
    console.log('');
    fail(`Error: ${err.message}`);
    console.log('');
    process.exit(1);
  }
}

main();
