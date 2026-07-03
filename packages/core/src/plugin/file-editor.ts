import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile, copyFile, readdir, stat } from "node:fs/promises";
import { join, normalize } from "node:path";

export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  isDirectory: boolean;
  isWritable: boolean;
}

export interface FileContent {
  path: string;
  content: string;
  language: string;
  backupPath: string | null;
}

export interface FileSaveResult {
  path: string;
  backupPath: string;
  success: boolean;
  error?: string;
}

const LANGUAGE_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".json": "json",
  ".css": "css",
  ".scss": "scss",
  ".html": "html",
  ".hbs": "handlebars",
  ".md": "markdown",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".prisma": "prisma",
  ".sql": "sql",
  ".env": "shell",
  ".sh": "shell",
  ".mjs": "javascript",
};

export class FileEditor {
  private pluginsDir: string;
  private backupDir: string;
  private disabled: boolean;

  constructor(pluginsDir: string, backupDir: string) {
    this.pluginsDir = pluginsDir;
    this.backupDir = join(backupDir, "file-editor-backups");
    this.disabled = process.env.NODEPRESS_DISABLE_FILE_EDITOR === "true";
    if (!this.disabled && !existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }
  }

  isDisabled(): boolean {
    return this.disabled;
  }

  async listFiles(slug: string, subPath: string = ""): Promise<FileInfo[]> {
    if (this.disabled) throw new Error("File editor is disabled via NODEPRESS_DISABLE_FILE_EDITOR");

    const baseDir = join(this.pluginsDir, slug);
    const targetDir = join(baseDir, subPath);

    this.validatePath(baseDir, targetDir);
    if (!existsSync(targetDir)) throw new Error(`Directory not found: ${subPath}`);

    const entries = await readdir(targetDir, { withFileTypes: true });
    const files: FileInfo[] = [];

    for (const entry of entries) {
      const fullPath = join(targetDir, entry.name);
      const fstat = await stat(fullPath);
      files.push({
        path: this.relativePath(baseDir, fullPath),
        name: entry.name,
        extension: this.getExtension(entry.name),
        size: fstat.size,
        isDirectory: entry.isDirectory(),
        isWritable: !entry.isDirectory() && this.isEditableFile(entry.name),
      });
    }

    files.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return files;
  }

  async readFile(slug: string, filePath: string): Promise<FileContent> {
    if (this.disabled) throw new Error("File editor is disabled via NODEPRESS_DISABLE_FILE_EDITOR");

    const baseDir = join(this.pluginsDir, slug);
    const fullPath = join(baseDir, filePath);

    this.validatePath(baseDir, fullPath);
    if (!existsSync(fullPath)) throw new Error(`File not found: ${filePath}`);
    if ((await stat(fullPath)).isDirectory()) throw new Error(`Path is a directory: ${filePath}`);

    const content = await readFile(fullPath, "utf-8");
    const ext = this.getExtension(filePath);
    const language = LANGUAGE_MAP[ext] ?? "plaintext";

    const relBackupPath = join(this.backupDir, slug, filePath + ".bak");
    const backupExists = existsSync(relBackupPath);

    return {
      path: filePath,
      content,
      language,
      backupPath: backupExists ? relBackupPath : null,
    };
  }

  async saveFile(slug: string, filePath: string, content: string): Promise<FileSaveResult> {
    if (this.disabled) throw new Error("File editor is disabled via NODEPRESS_DISABLE_FILE_EDITOR");

    const baseDir = join(this.pluginsDir, slug);
    const fullPath = join(baseDir, filePath);

    this.validatePath(baseDir, fullPath);
    if (!existsSync(fullPath)) throw new Error(`File not found: ${filePath}`);

    const backupPath = join(this.backupDir, slug, filePath + ".bak");
    const backupDirPath = this.dirnameOf(join(this.backupDir, slug, filePath));
    if (!existsSync(backupDirPath)) {
      mkdirSync(backupDirPath, { recursive: true });
    }

    try {
      await copyFile(fullPath, backupPath);
    } catch {
      // ignore backup failure
    }

    try {
      await writeFile(fullPath, content, "utf-8");
      return { path: filePath, backupPath, success: true };
    } catch (err) {
      return {
        path: filePath,
        backupPath,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  private validatePath(baseDir: string, targetPath: string): void {
    const normalized = normalize(targetPath);
    const base = normalize(baseDir);

    if (!normalized.startsWith(base)) {
      throw new Error("Invalid path: directory traversal detected");
    }
  }

  private isEditableFile(fileName: string): boolean {
    const ext = this.getExtension(fileName);
    return [
      ".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".scss",
      ".html", ".hbs", ".md", ".yaml", ".yml", ".sql",
      ".env", ".sh", ".mjs",
    ].includes(ext);
  }

  private getExtension(path: string): string {
    const idx = path.lastIndexOf(".");
    return idx > 0 ? path.slice(idx).toLowerCase() : "";
  }

  private relativePath(from: string, to: string): string {
    const fromParts = normalize(from).replace(/\\/g, "/").split("/");
    const toParts = normalize(to).replace(/\\/g, "/").split("/");

    let i = 0;
    while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
      i++;
    }

    const result: string[] = [];
    for (let j = i; j < fromParts.length; j++) {
      result.push("..");
    }
    for (let j = i; j < toParts.length; j++) {
      result.push(toParts[j]);
    }

    return result.join("/") || ".";
  }

  private dirnameOf(path: string): string {
    const parts = normalize(path).replace(/\\/g, "/").split("/");
    parts.pop();
    return parts.join("/");
  }
}
