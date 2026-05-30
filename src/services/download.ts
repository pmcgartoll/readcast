import { Directory, File, Paths } from 'expo-file-system';

import type { AudioJob } from '../types';

const ROOT = 'readcast-audio';

function extFromUri(uri: string): string {
  const clean = uri.split('?')[0].split('#')[0];
  const match = /\.([a-z0-9]{2,5})$/i.exec(clean);
  return match ? match[1].toLowerCase() : 'mp3';
}

/**
 * Downloads any remote segments to a per-article local cache and returns a job
 * whose segment URIs point at the local files, so listening works offline and
 * never re-fetches. Already-local segments are kept as-is; download failures
 * fall back to the remote URI so playback can still stream.
 */
export async function cacheSegments(job: AudioJob): Promise<AudioJob> {
  if (job.segments.length === 0) return job;

  const dir = new Directory(Paths.cache, ROOT, job.articleId);
  try {
    if (!dir.exists) dir.create({ intermediates: true });
  } catch {
    return job;
  }

  const segments = await Promise.all(
    job.segments.map(async (seg) => {
      if (!/^https?:/i.test(seg.uri)) return seg;
      const dest = new File(dir, `${seg.index}.${extFromUri(seg.uri)}`);
      try {
        if (dest.exists) return { ...seg, uri: dest.uri };
        const file = await File.downloadFileAsync(seg.uri, dest, {
          idempotent: true,
        });
        return { ...seg, uri: file.uri };
      } catch {
        return seg;
      }
    }),
  );

  return { ...job, segments };
}
