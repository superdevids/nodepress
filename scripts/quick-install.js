#!/usr/bin/env node

/**
 * ============================================================
 * NodePress Quick Install
 * ============================================================
 * NodePress's famous "5-minute installation" experience.
 *
 * Usage:
 *   node scripts/quick-install.js
 *
 * What it does:
 *   1. Checks if Node.js 20+ is installed
 *   2. Auto-detects PostgreSQL (Docker or local)
 *   3. Prompts for Docker or manual connection
 *   4. Creates .env with auto-generated secrets
 *   5. Runs Prisma db push (creates tables)
 *   6. Seeds default data
 *   7. Prints success message with login URL
 *
 * No technical knowledge required. Just answer 5 simple questions.
 * ============================================================
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env');

// ── Terminal Colors ────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function color(text, c) {
  return `${c}${text}${C.reset}`;
}

// ── Readline Interface ────────────────────────────────────────
function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl, query, defaultValue = '') {
  return new Promise((resolve) => {
    const defaultStr = defaultValue ? ` [${color(defaultValue, C.dim)}]` : '';
    rl.question(`${color('?', C.cyan)} ${query}${defaultStr}: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function confirm(rl, query, defaultYes = true) {
  const hint = defaultYes ? 'Y/n' : 'y/N';
  return new Promise((resolve) => {
    rl.question(`${color('?', C.cyan)} ${query} ${color(`(${hint})`, C.dim)} `, (answer) => {
      const a = answer.trim().toLowerCase();
      if (a === '') resolve(defaultYes);
      else resolve(a === 'y' || a === 'yes');
    });
  });
}

// ── System Utilities ──────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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
    return { success: true, output: '' };
  } catch (e) {
    const output = e.stdout?.toString() || e.message || '';
    return { success: false, output };
  }
}

function capture(cmd, timeout = 30000) {
  try {
    return execSync(cmd, {
      stdio: 'pipe',
      cwd: ROOT,
      encoding: 'utf-8',
      timeout,
    }).trim();
  } catch {
    return '';
  }
}

function generateSecret(length = 48) {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

// ── Banner ────────────────────────────────────────────────────

function showBanner() {
  console.log('');
  console.log(color('╔══════════════════════════════════════════════════════════╗', C.cyan));
  console.log(
    color('║', C.cyan),
    color('  🚀  NodePress Quick Install', C.bold),
    color('                ║', C.cyan),
  );
  console.log(
    color('║', C.cyan),
    color('      Modern CMS — 5-minute install', C.dim),
    color(' ║', C.cyan),
  );
  console.log(color('╚══════════════════════════════════════════════════════════╝', C.cyan));
  console.log('');
  console.log(color('  This installer will get NodePress up and running.', C.bold));
  console.log(color('  Just answer 5 simple questions — no technical knowledge needed!', C.dim));
  console.log('');
}

// ── Step 1: Check Node.js ─────────────────────────────────────

function checkNodeVersion() {
  const nodeVer = process.version;
  const major = parseInt(nodeVer.slice(1));
  if (major < 20) {
    console.log(`  ${color('✗', C.red)} Node.js ${nodeVer} detected. Version 20+ required.`);
    console.log(`  ${color('→', C.yellow)} Download: https://nodejs.org/`);
    process.exit(1);
  }
  console.log(`  ${color('✓', C.green)} Node.js ${nodeVer}`);
  return true;
}

// ── Step 2: Package Manager ───────────────────────────────────

function detectPkgManager() {
  if (
    fs.existsSync(path.join(ROOT, 'node_modules', '.pnpm')) ||
    fs.existsSync(path.join(ROOT, 'pnpm-lock.yaml'))
  ) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(ROOT, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(ROOT, 'package-lock.json'))) return 'npm';
  return 'npm';
}

// ── Step 3: Dependency Check ──────────────────────────────────

function checkDependencies() {
  const hasNodeModules = fs.existsSync(path.join(ROOT, 'node_modules'));
  if (!hasNodeModules) {
    console.log(`  ${color('○', C.yellow)} Dependencies not installed yet.`);
    return false;
  }
  console.log(`  ${color('✓', C.green)} Dependencies found`);
  return true;
}

function installDependencies(pm) {
  console.log(`  ${color('→', C.blue)} Installing dependencies with ${pm}...`);
  const cmd = pm === 'pnpm' ? 'pnpm install' : pm === 'yarn' ? 'yarn install' : 'npm install';
  const result = run(cmd, { timeout: 180000 });
  if (result.success) {
    console.log(`  ${color('✓', C.green)} Dependencies installed`);
  } else {
    console.log(`  ${color('✗', C.red)} Failed to install dependencies`);
    process.exit(1);
  }
}

// ── Step 4: Database Setup ───────────────────────────────────

async function setupDatabase(rl) {
  console.log('');
  console.log(color('  ── Database Setup ─────────────────────────────────────', C.magenta));
  console.log('');

  // Check if Docker is available
  const hasDocker = capture('docker --version');
  let dbMethod = '';

  if (hasDocker) {
    console.log(`  ${color('✓', C.green)} Docker Desktop detected`);
    const useDocker = await confirm(rl, 'Use Docker for PostgreSQL? (recommended)', true);
    if (useDocker) {
      dbMethod = 'docker';
    } else {
      dbMethod = 'manual';
    }
  } else {
    console.log(`  ${color('○', C.yellow)} Docker not found`);
    const wantDocker = await confirm(
      rl,
      'Install Docker Desktop? (recommended for easy setup)',
      true,
    );
    if (wantDocker) {
      console.log(
        `  ${color('→', C.blue)} Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/`,
      );
      console.log(`  ${color('→', C.blue)} Then run this installer again.`);
      console.log('');
      const tryManual = await confirm(rl, 'Continue with manual database setup instead?', true);
      if (tryManual) {
        dbMethod = 'manual';
      } else {
        process.exit(0);
      }
    } else {
      dbMethod = 'manual';
    }
  }

  let dbConfig;

  if (dbMethod === 'docker') {
    console.log(`  ${color('→', C.blue)} Starting PostgreSQL via Docker...`);

    // Check if Docker daemon is running
    const dockerRunning = capture('docker info', 5000);
    if (!dockerRunning) {
      console.log(`  ${color('✗', C.red)} Docker daemon is not running.`);
      console.log(`  ${color('→', C.yellow)} Please start Docker Desktop and try again.`);
      console.log('');
      const tryManual = await confirm(rl, 'Continue with manual database setup?', true);
      if (tryManual) {
        dbMethod = 'manual';
      } else {
        process.exit(1);
      }
    } else {
      // Start PostgreSQL container
      console.log(`  ${color('→', C.blue)} Starting PostgreSQL container...`);
      const composeFile = path.join(ROOT, 'docker-compose.yml');
      if (fs.existsSync(composeFile)) {
        const startResult = run('docker compose up -d postgres pgbouncer', {
          timeout: 180000,
          silent: true,
        });
        if (startResult.success) {
          console.log(`  ${color('✓', C.green)} PostgreSQL started on port 5432`);
          dbConfig = {
            host: 'localhost',
            port: 5432,
            name: 'nodepress',
            user: 'nodepress',
            password: 'nodepress',
            usePgBouncer: false,
          };
        } else {
          console.log(
            `  ${color('✗', C.red)} Could not start Docker container: ${startResult.output.slice(0, 200)}`,
          );
          const tryManual = await confirm(rl, 'Try manual database setup?', true);
          if (tryManual) {
            dbMethod = 'manual';
          } else {
            process.exit(1);
          }
        }
      } else {
        console.log(`  ${color('○', C.yellow)} docker-compose.yml not found, trying manual setup`);
        dbMethod = 'manual';
      }
    }
  }

  if (dbMethod === 'manual') {
    console.log('');
    console.log(`  ${color('→', C.blue)} Enter your PostgreSQL connection details:`);
    console.log(`  ${color('(Press Enter for defaults if using Docker PostgreSQL)', C.dim)}`);
    console.log('');

    const dbHost = await question(rl, 'Database Host', 'localhost');
    const dbPortStr = await question(rl, 'Database Port', '5432');
    const dbPort = parseInt(dbPortStr) || 5432;
    const dbName = await question(rl, 'Database Name', 'nodepress');
    const dbUser = await question(rl, 'Database User', 'nodepress');
    const dbPassword = await question(rl, 'Database Password', 'nodepress');

    dbConfig = {
      host: dbHost,
      port: dbPort,
      name: dbName,
      user: dbUser,
      password: dbPassword,
      usePgBouncer: true,
    };

    // Test the connection
    console.log(`  ${color('→', C.blue)} Testing database connection...`);
    const testUrl = `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.name}`;

    // Try a quick psql-style test using Node's pg module or fallback
    let connected = false;
    try {
      // Try using Prisma to test connection
      const testResult = run(
        `npx prisma db push --schema="${path.join(ROOT, 'packages', 'db', 'prisma', 'schema.prisma')}" --accept-data-loss --skip-generate`,
        { silent: true, timeout: 30000, env: { ...process.env, DATABASE_URL: testUrl } },
      );
      if (testResult.success) {
        connected = true;
      }
    } catch {
      // Fallback: just warn and continue
    }

    if (!connected) {
      // Try a simpler test - just see if we can resolve and connect
      try {
        const net = require('net');
        await new Promise((resolve, reject) => {
          const socket = net.createConnection(dbConfig.port, dbConfig.host, () => {
            socket.end();
            resolve();
          });
          socket.on('error', reject);
          socket.setTimeout(5000);
          socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('timeout'));
          });
        });
        connected = true;
        console.log(`  ${color('✓', C.green)} Port ${dbConfig.port} is open on ${dbConfig.host}`);
      } catch {
        console.log(`  ${color('⚠', C.yellow)} Could not verify connection. Will try anyway.`);
      }
    } else {
      console.log(`  ${color('✓', C.green)} Database connection successful`);
    }
  }

  return dbConfig;
}

// ── Step 5: Create .env ───────────────────────────────────────

function createEnvFile(dbConfig, pm) {
  console.log('');
  console.log(color('  ── Configuration ───────────────────────────────────────', C.magenta));
  console.log('');

  const jwtSecret = generateSecret();
  const jwtRefreshSecret = generateSecret();
  const encryptionKey = crypto.randomBytes(32).toString('hex');
  const authKey = crypto.randomBytes(48).toString('base64').slice(0, 48);
  const secureAuthKey = crypto.randomBytes(48).toString('base64').slice(0, 48);
  const loggedInKey = crypto.randomBytes(48).toString('base64').slice(0, 48);
  const nonceKey = crypto.randomBytes(48).toString('base64').slice(0, 48);
  const secretKey = crypto.randomBytes(48).toString('base64').slice(0, 48);

  // Build database URLs
  const dbUrl = `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.name}`;
  const dbDirectUrl = dbUrl; // Direct connection (PgBouncer bypass not needed for local)
  const redisUrl = 'redis://localhost:6379';

  const envContent = `# ============================================================
# NodePress Configuration — Auto-generated by Quick Install
# ============================================================

# API Server
PORT=3001

# Database — PostgreSQL
DATABASE_URL=${dbUrl}
DATABASE_DIRECT_URL=${dbDirectUrl}

# Redis — Cache & Queue
REDIS_URL=${redisUrl}

# S3 / MinIO — Media Storage
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=nodepress
S3_SECRET_KEY=nodepress123
S3_BUCKET=nodepress-media
S3_PUBLIC_URL=http://localhost:9000/nodepress-media

# Authentication & JWT
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${jwtRefreshSecret}
ENCRYPTION_KEY=${encryptionKey}
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
JWT_ISSUER=nodepress

# Security Keys & Salts (Modern CMS)
AUTH_KEY=${authKey}
SECURE_AUTH_KEY=${secureAuthKey}
LOGGED_IN_KEY=${loggedInKey}
NONCE_KEY=${nonceKey}
SECRET_KEY=${secretKey}
AUTH_SALT=${generateSecret()}
SECURE_AUTH_SALT=${generateSecret()}
LOGGED_IN_SALT=${generateSecret()}
NONCE_SALT=${generateSecret()}

# Application URLs
APP_URL=http://localhost:3000
API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Environment
NODE_ENV=development
NODEPRESS_DEBUG=true
LOG_LEVEL=debug
LOG_FILE=storage/logs/nodepress.log

# Maintenance
MAINTENANCE_MODE=false
MAINTENANCE_ALLOWED_IPS=
`;

  fs.writeFileSync(ENV_FILE, envContent, 'utf-8');
  console.log(`  ${color('✓', C.green)} .env file created with auto-generated secrets`);
  console.log(`  ${color('→', C.dim)} File: ${ENV_FILE}`);
}

// ── Step 6: Run Database Setup ────────────────────────────────

async function setupDatabaseSchema(pm) {
  console.log('');
  console.log(color('  ── Database Schema ─────────────────────────────────────', C.magenta));
  console.log('');

  const cmd = pm === 'pnpm' ? 'pnpm' : pm === 'yarn' ? 'yarn' : 'npm run';

  // Generate Prisma client
  console.log(`  ${color('→', C.blue)} Generating Prisma client...`);
  const genResult = run(`${cmd} db:generate`, { silent: true });
  if (genResult.success) {
    console.log(`  ${color('✓', C.green)} Prisma client generated`);
  } else {
    console.log(`  ${color('✗', C.red)} Failed to generate Prisma client`);
    process.exit(1);
  }

  // Create database tables
  console.log(`  ${color('→', C.blue)} Creating database tables...`);
  const pushResult = run(`${cmd} db:push`, { silent: true, timeout: 60000 });
  if (pushResult.success) {
    console.log(`  ${color('✓', C.green)} Database tables created`);
  } else {
    console.log(`  ${color('✗', C.red)} Failed to create database tables`);
    console.log(`  ${color('→', C.yellow)} Check your database connection and try again.`);
    process.exit(1);
  }

  // Seed default data
  console.log(`  ${color('→', C.blue)} Adding default data...`);
  const seedResult = run(`${cmd} db:seed`, { silent: true, timeout: 30000 });
  if (seedResult.success) {
    console.log(`  ${color('✓', C.green)} Default data seeded`);
  } else {
    console.log(`  ${color('⚠', C.yellow)} Seed warning (data may already exist)`);
  }

  return true;
}

// ── Step 7: Success Message ───────────────────────────────────

function showSuccess() {
  console.log('');
  console.log(color('╔══════════════════════════════════════════════════════════╗', C.green));
  console.log(
    color('║', C.green),
    color('            ✅  NodePress is Ready!', C.bold),
    color('               ║', C.green),
  );
  console.log(color('╚══════════════════════════════════════════════════════════╝', C.green));
  console.log('');
  console.log(`  ${color('🌐', C.cyan)} Admin Panel:  ${color('http://localhost:3000', C.bold)}`);
  console.log(`  ${color('📖', C.cyan)} API:          ${color('http://localhost:3001', C.bold)}`);
  console.log(
    `  ${color('📚', C.cyan)} API Docs:     ${color('http://localhost:3001/docs', C.bold)}`,
  );
  console.log('');
  console.log(color('  Next steps:', C.bold));
  console.log(
    `   1. Run ${color('node start.js', C.cyan)} or ${color('npm start', C.cyan)} to start NodePress`,
  );
  console.log(`   2. Open ${color('http://localhost:3000', C.bold)} in your browser`);
  console.log(`   3. Follow the Install Wizard (5 steps, ~2 minutes)`);
  console.log('');
  console.log(color('  Quick start:', C.dim));
  console.log(`    ${color('npm start', C.cyan)}   →   ${color('http://localhost:3000', C.cyan)}`);
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  showBanner();

  const rl = createPrompt();

  try {
    // Step 1: Check Node.js
    console.log(color('  ── System Check ───────────────────────────────────────', C.magenta));
    console.log('');
    checkNodeVersion();
    const pm = detectPkgManager();
    console.log(`  ${color('✓', C.green)} Package manager: ${pm}`);

    // Step 2: Check / Install dependencies
    if (!checkDependencies()) {
      installDependencies(pm);
    }

    // Step 3: Database setup
    const dbConfig = await setupDatabase(rl);

    // Step 4: Create .env
    createEnvFile(dbConfig, pm);

    // Step 5: Run database schema
    await setupDatabaseSchema(pm);

    // Step 6: Show success
    showSuccess();

    // Ask if they want to start NodePress now
    const startNow = await confirm(rl, 'Start NodePress now?', true);
    if (startNow) {
      console.log(`  ${color('→', C.blue)} Starting NodePress...`);
      console.log('');

      // Launch the dev server
      const dev = spawn('node', ['start.js'], {
        stdio: 'inherit',
        cwd: ROOT,
        shell: true,
        env: { ...process.env },
      });

      dev.on('close', (code) => {
        process.exit(code || 0);
      });

      // Keep the parent process alive
      process.on('SIGINT', () => {
        dev.kill('SIGTERM');
        process.exit(0);
      });
      process.on('SIGTERM', () => {
        dev.kill('SIGTERM');
        process.exit(0);
      });
    } else {
      console.log(
        `  ${color('→', C.dim)} Run ${color('npm start', C.cyan)} whenever you're ready.`,
      );
      console.log('');
      process.exit(0);
    }
  } catch (err) {
    console.log('');
    console.log(`  ${color('✗', C.red)} Error: ${err.message}`);
    console.log('');
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
