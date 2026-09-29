import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { AppError } from "../utils/app-error";

const BUCKET = process.env.SUPABASE_BUCKET ?? "posters";

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

// ponytail: tanpa kredensial Supabase, poster ditulis ke ./uploads dan dilayani
// express.static. Cukup untuk development; di host ephemeral (Vercel/Railway)
// berkasnya hilang tiap deploy, jadi produksi wajib mengisi SUPABASE_*.
export const usesLocalStorage = supabase === null;

const localRoot = () => join(process.cwd(), "uploads");
const publicBase = () => process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;

export interface StoredFile {
  path: string;
  url: string;
}

export async function uploadPoster(eventId: string, body: Buffer): Promise<StoredFile> {
  const path = `events/${eventId}/${randomUUID()}.webp`;

  if (supabase) {
    const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw new AppError(502, "storage-error", "Gagal mengunggah poster.");
    return { path, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
  }

  const target = join(localRoot(), path);
  try {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
  } catch {
    throw new AppError(502, "storage-error", "Gagal mengunggah poster.");
  }
  return { path, url: `${publicBase()}/uploads/${path}` };
}

// Best effort: berkas lama yang gagal dihapus hanya menjadi orphan, tidak menggagalkan request.
export async function removePoster(path: string): Promise<void> {
  try {
    if (supabase) await supabase.storage.from(BUCKET).remove([path]);
    else await rm(join(localRoot(), path), { force: true });
  } catch (error) {
    console.warn(`Gagal menghapus poster ${path}`, error);
  }
}
