import fs from 'fs';
import path from 'path';

import { DATA_DIR } from './config.js';

const IMAGES_DIR = path.join(DATA_DIR, 'images');

interface ImageSidecar {
  base64: string;
  mediaType: string;
}

/** Download photo from Telegram Bot API file_path */
export async function downloadTelegramPhoto(
  botToken: string,
  filePath: string,
): Promise<Buffer> {
  const url = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Save base64 sidecar + raw image file to data/images/{chatJid}/{messageId}.* */
export function saveImageSidecar(
  chatJid: string,
  messageId: string,
  base64: string,
  mediaType: string,
): string {
  const dir = path.join(IMAGES_DIR, sanitizeJid(chatJid));
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${messageId}.json`);
  fs.writeFileSync(filePath, JSON.stringify({ base64, mediaType }));
  // Also save the raw image file so agents can access it directly
  const ext = mediaType === 'image/png' ? '.png' : '.jpg';
  const rawPath = path.join(dir, `${messageId}${ext}`);
  fs.writeFileSync(rawPath, Buffer.from(base64, 'base64'));
  return filePath;
}

/** Get the container-visible path for a saved image */
export function getContainerImagePath(
  chatJid: string,
  messageId: string,
  mediaType: string,
): string {
  const ext = mediaType === 'image/png' ? '.png' : '.jpg';
  return `/workspace/images/${sanitizeJid(chatJid)}/${messageId}${ext}`;
}

/** Load sidecar — returns null if missing */
export function loadImageSidecar(refPath: string): ImageSidecar | null {
  try {
    return JSON.parse(fs.readFileSync(refPath, 'utf-8'));
  } catch {
    return null;
  }
}

/** Probe for sidecar at deterministic path */
export function getImageRefPath(
  chatJid: string,
  messageId: string,
): string | null {
  const p = path.join(IMAGES_DIR, sanitizeJid(chatJid), `${messageId}.json`);
  return fs.existsSync(p) ? p : null;
}

function sanitizeJid(jid: string): string {
  return jid.replace(/[^a-zA-Z0-9_:-]/g, '_');
}
