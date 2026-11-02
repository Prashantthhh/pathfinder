// Downloads the O*NET database (text version) into .cache/onet and unpacks it.
//   npm run onet:fetch
//
// O*NET is published by the U.S. Department of Labor, Employment and Training
// Administration under CC BY 4.0: https://www.onetcenter.org/license_db.html
// The raw files are NOT committed (they are large and the licence needs
// attribution); only the small derived JSON files in src/data are.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

export const ONET_VERSION = '31.0';
const URL_ZIP = `https://www.onetcenter.org/dl_files/database/db_${ONET_VERSION.replace('.', '_')}_text.zip`;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const CACHE = join(root, '.cache', 'onet');
export const DB_DIR = join(CACHE, `db_${ONET_VERSION.replace('.', '_')}_text`);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(CACHE, { recursive: true });
  const zipPath = join(CACHE, 'db_text.zip');
  if (!existsSync(zipPath) || process.argv.includes('--force')) {
    console.log(`Downloading ${URL_ZIP} ...`);
    const res = await fetch(URL_ZIP);
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
    writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
  } else {
    console.log('Using cached zip (pass --force to download again).');
  }
  const bytes = readFileSync(zipPath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const files = unzipSync(new Uint8Array(bytes));
  mkdirSync(DB_DIR, { recursive: true });
  let n = 0;
  for (const [name, data] of Object.entries(files)) {
    if (name.endsWith('/')) continue;
    const base = name.split('/').pop();
    writeFileSync(join(DB_DIR, base), data);
    n++;
  }
  writeFileSync(join(CACHE, 'sha256.txt'), `${sha256}\n`);
  console.log(`Unpacked ${n} files to ${DB_DIR}\nsha256 ${sha256}`);
}
