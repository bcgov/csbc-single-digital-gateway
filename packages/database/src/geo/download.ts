import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { fetchGeoText, GEO_DATA_FILES, GEO_DATA_REF } from './source';

/**
 * Build-time vendor download: fetch the pinned upstream JSON files and write them verbatim into a
 * target directory. Run during `docker build` (CI has GitHub egress) so the runtime migrate Job can
 * read the baked-in files (`GEO_DATA_DIR`) with NO runtime egress. Feature 152.
 *
 *   node dist-scripts/geo-download.js <target-dir>   (default: ./geo-data)
 */
async function download(): Promise<void> {
  const targetDir = resolve(process.argv[2] ?? 'geo-data');
  await mkdir(targetDir, { recursive: true });
  console.info(`[geo:download] ref=${GEO_DATA_REF} -> ${targetDir}`);

  for (const fileName of GEO_DATA_FILES) {
    // eslint-disable-next-line no-await-in-loop -- sequential downloads: simple + gentle on the CDN
    const text = await fetchGeoText(fileName);
    // eslint-disable-next-line no-await-in-loop -- write before the next fetch
    await writeFile(join(targetDir, fileName), text);
    console.info(`[geo:download] ${fileName} (${text.length} bytes)`);
  }

  console.info('[geo:download] done.');
}

download().catch((error: unknown) => {
  console.error('[geo:download] failed:', error);
  process.exitCode = 1;
});
