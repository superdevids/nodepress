import { randomBytes } from 'crypto'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

export interface DatabaseConfig {
  host: string
  port: number
  name: string
  user: string
  password: string
}

export interface SecurityKeys {
  AUTH_KEY: string
  SECURE_AUTH_KEY: string
  LOGGED_IN_KEY: string
  NONCE_KEY: string
  AUTH_SALT: string
  SECURE_AUTH_SALT: string
  LOGGED_IN_SALT: string
  NONCE_SALT: string
  SECRET_KEY: string
}

export interface NodePressConfig {
  db: DatabaseConfig
  security: SecurityKeys
  installed: boolean
  installedAt: string | null
  version: string
}

function generateKey(): string {
  return randomBytes(32).toString('hex')
}

export function generateSecurityKeys(): SecurityKeys {
  return {
    AUTH_KEY: generateKey(),
    SECURE_AUTH_KEY: generateKey(),
    LOGGED_IN_KEY: generateKey(),
    NONCE_KEY: generateKey(),
    AUTH_SALT: generateKey(),
    SECURE_AUTH_SALT: generateKey(),
    LOGGED_IN_SALT: generateKey(),
    NONCE_SALT: generateKey(),
    SECRET_KEY: generateKey(),
  }
}

export function getConfigDir(): string {
  const fromEnv = process.env.NODEPRESS_CONFIG_DIR
  if (fromEnv) return fromEnv
  return join(process.cwd(), 'config')
}

export function getConfigPath(): string {
  return join(getConfigDir(), 'nodepress.config.json')
}

export function loadConfig(): NodePressConfig | null {
  const configPath = getConfigPath()
  if (!existsSync(configPath)) return null
  try {
    const raw = require('fs').readFileSync(configPath, 'utf-8')
    return JSON.parse(raw) as NodePressConfig
  } catch {
    return null
  }
}

export function isInstalled(): boolean {
  const config = loadConfig()
  return config !== null && config.installed === true
}

export function saveConfig(config: NodePressConfig): void {
  const configDir = getConfigDir()
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8')
}

export function buildDatabaseUrl(db: DatabaseConfig): string {
  return `postgresql://${db.user}:${db.password}@${db.host}:${db.port}/${db.name}`
}

export function generateConfig(
  db: DatabaseConfig,
  keys: SecurityKeys,
): NodePressConfig {
  return {
    db,
    security: keys,
    installed: true,
    installedAt: new Date().toISOString(),
    version: '0.1.0',
  }
}
