import chalk from 'chalk';
import ora from 'ora';

// ─── Spinner ────────────────────────────────────────────────────────────────

export function createSpinner(text: string) {
  return ora({ text, color: 'cyan' });
}

// ─── Colored Output ─────────────────────────────────────────────────────────

export function info(msg: string): void {
  console.log(chalk.blue('ℹ'), msg);
}

export function success(msg: string): void {
  console.log(chalk.green('✔'), msg);
}

export function warn(msg: string): void {
  console.log(chalk.yellow('⚠'), msg);
}

export function error(msg: string): void {
  console.error(chalk.red('✖'), msg);
}

export function highlight(msg: string): string {
  return chalk.cyan(msg);
}

export function dim(msg: string): string {
  return chalk.dim(msg);
}

export function bold(msg: string): string {
  return chalk.bold(msg);
}

// ─── Table Helpers ──────────────────────────────────────────────────────────

export function printTable(headers: string[], rows: string[][]): void {
  // Calculate column widths
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] || '').length))
  );

  // Print header
  const headerLine = headers
    .map((h, i) => chalk.bold(h.padEnd(colWidths[i])))
    .join('  ');
  console.log(headerLine);
  console.log(chalk.dim('─'.repeat(headerLine.length)));

  // Print rows
  for (const row of rows) {
    const line = row.map((cell, i) => cell.padEnd(colWidths[i])).join('  ');
    console.log(line);
  }
}

// ─── Divider ────────────────────────────────────────────────────────────────

export function divider(): void {
  console.log(chalk.dim('─'.repeat(process.stdout.columns || 60)));
}
