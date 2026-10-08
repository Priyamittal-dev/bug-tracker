import path from "path";
import crypto from "crypto";

export interface StorageResult {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface IStorageProvider {
  upload(file: {
    name: string;
    size: number;
    type: string;
    buffer?: Buffer;
  }): Promise<StorageResult>;
  delete(url: string): Promise<boolean>;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const DISALLOWED_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".bash",
  ".msi",
  ".dll",
  ".vbs",
  ".ps1",
  ".scr",
  ".com",
  ".pif",
]);

const ALLOWED_MIME_PREFIXES = [
  "image/",
  "text/",
  "application/pdf",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
  "application/gzip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.",
];

export function sanitizeFileName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const base = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_\-]/g, "_")
    .slice(0, 50);
  const randomSuffix = crypto.randomBytes(4).toString("hex");
  return `${base || "attachment"}_${randomSuffix}${ext}`;
}

export function validateAttachmentFile(file: {
  name: string;
  size: number;
  type: string;
}): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "File size exceeds the 10MB limit." };
  }

  const ext = path.extname(file.name).toLowerCase();
  if (DISALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: "Executable files are strictly prohibited." };
  }

  const isAllowedMime = ALLOWED_MIME_PREFIXES.some((prefix) =>
    file.type.startsWith(prefix),
  );
  if (!isAllowedMime && file.type !== "application/octet-stream") {
    return { valid: false, error: "Unsupported file type." };
  }

  return { valid: true };
}

export class MemoryStorageProvider implements IStorageProvider {
  async upload(file: {
    name: string;
    size: number;
    type: string;
    buffer?: Buffer;
  }): Promise<StorageResult> {
    const check = validateAttachmentFile(file);
    if (!check.valid) {
      throw new Error(check.error);
    }

    const safeName = sanitizeFileName(file.name);
    // Cloud storage / mock CDN URL representation
    const mockStorageUrl = `/uploads/issues/${safeName}`;

    return {
      url: mockStorageUrl,
      fileName: safeName,
      fileSize: file.size,
      mimeType: file.type,
    };
  }

  async delete(_url: string): Promise<boolean> {
    return true;
  }
}

export const storageProvider: IStorageProvider = new MemoryStorageProvider();
