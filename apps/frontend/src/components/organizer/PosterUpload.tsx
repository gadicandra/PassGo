"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Poster } from "@/components/event/Poster";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { Event } from "@/types/api";
import { deletePoster, isEditable, uploadPoster } from "@/lib/organizer/api";
import { currentFrom, errorMessage } from "@/lib/organizer/errors";

const MAX_BYTES = 2 * 1024 * 1024;
const MIN_SIDE = 600;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Cek yang sama dengan backend (§9.5) sebelum upload, supaya tidak buang kuota & waktu. null = lolos. */
export async function checkPosterFile(file: File): Promise<string | null> {
  if (!TYPES.includes(file.type)) return "Poster harus JPEG, PNG, atau WebP.";
  if (file.size > MAX_BYTES) return "Berkas poster maksimal 2 MB.";
  try {
    const bitmap = await createImageBitmap(file);
    const small = bitmap.width < MIN_SIDE || bitmap.height < MIN_SIDE;
    bitmap.close();
    if (small) return `Poster minimal ${MIN_SIDE} × ${MIN_SIDE} piksel.`;
  } catch {
    return "Berkas gambar tidak bisa dibaca.";
  }
  return null;
}

const HINT = "JPEG, PNG, atau WebP. Maks. 2 MB, minimal 600 × 600 px. Rasio 4:5 paling pas.";

function FilePicker({ label, disabled, onPick }: { label: string; disabled?: boolean; onPick: (file: File) => void }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        id={id}
        type="file"
        accept={TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
      <Button variant="outline" size="sm" disabled={disabled} onClick={() => input.current?.click()}>
        {label}
      </Button>
    </>
  );
}

/** Pratinjau poster seperti di katalog (4:5, duotone). */
function Preview({ event }: { event: Pick<Event, "id" | "title" | "startAt" | "timezone" | "posterUrl" | "status" | "salesStatus"> }) {
  return (
    <div className="w-full max-w-[280px]">
      <Poster event={event} stock={false} />
    </div>
  );
}

/** Untuk form buat acara: berkas disimpan dulu, diunggah setelah acara dibuat. */
export function PosterPicker({ file, onChange }: { file: File | null; onChange: (file: File | null) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  function showPreview(next: File | null) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next ? URL.createObjectURL(next) : null;
    setUrl(urlRef.current);
    onChange(next);
  }

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  return (
    <section className="flex flex-col gap-3 lg:sticky lg:top-28">
      <h2 className="text-[20px] font-semibold">Poster</h2>
      <Preview
        event={{ id: "baru", title: "Acara baru", startAt: new Date().toISOString(), timezone: "Asia/Jakarta", posterUrl: file ? url : null, status: "DRAFT", salesStatus: "UPCOMING" }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <FilePicker
          label={file ? "Ganti berkas" : "Pilih berkas"}
          onPick={async (picked) => {
            const problem = await checkPosterFile(picked);
            setError(problem);
            if (!problem) showPreview(picked);
          }}
        />
        {file && (
          <Button variant="text" size="sm" onClick={() => showPreview(null)}>
            Batal pakai
          </Button>
        )}
      </div>
      {file && <p className="truncate text-sm text-muted">{file.name}</p>}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : (
        <p className="text-sm text-muted">{HINT} Bisa juga ditambahkan nanti.</p>
      )}
    </section>
  );
}

/** Untuk acara yang sudah ada: unggah/ganti langsung, hapus dengan konfirmasi. */
export function PosterPanel({ event, onEventChange }: { event: Event; onEventChange: (event: Event) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<"upload" | "delete" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editable = isEditable(event);

  async function run(kind: "upload" | "delete", action: () => Promise<Event>, success: string) {
    setBusy(kind);
    setError(null);
    try {
      onEventChange(await action());
      toast.success(success);
      setConfirming(false);
    } catch (caught) {
      const current = currentFrom<Event>(caught);
      if (current) onEventChange(current);
      setError(errorMessage(caught, "Poster gagal disimpan."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="flex flex-col gap-3 lg:sticky lg:top-28">
      <h2 className="text-[20px] font-semibold">Poster</h2>
      <Preview event={event} />
      {editable && (
        <div className="flex flex-wrap items-center gap-3">
          <FilePicker
            label={event.posterUrl ? "Ganti poster" : "Unggah poster"}
            disabled={busy !== null}
            onPick={async (file) => {
              const problem = await checkPosterFile(file);
              if (problem) return setError(problem);
              await run("upload", () => uploadPoster(event, file), "Poster tersimpan.");
            }}
          />
          {event.posterUrl && !confirming && (
            <Button variant="text" size="sm" disabled={busy !== null} onClick={() => setConfirming(true)}>
              Hapus poster
            </Button>
          )}
          {busy === "upload" && <span className="text-sm text-muted">Mengunggah…</span>}
        </div>
      )}
      {confirming && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-white px-3 py-2.5 text-sm">
          <span>Hapus poster ini?</span>
          <Button variant="dark" size="sm" loading={busy === "delete"} onClick={() => run("delete", () => deletePoster(event), "Poster dihapus.")}>
            Hapus
          </Button>
          <Button variant="text" size="sm" disabled={busy === "delete"} onClick={() => setConfirming(false)}>
            Batal
          </Button>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : (
        editable && <p className="text-sm text-muted">{HINT}</p>
      )}
    </section>
  );
}
