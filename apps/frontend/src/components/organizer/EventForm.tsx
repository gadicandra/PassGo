"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Select, TextArea } from "@/components/ui/Field";
import type { Event } from "@/types/api";
import type { EventBody } from "@/lib/organizer/api";
import { TIMEZONES, fromLocalInput, toLocalInput } from "@/lib/organizer/datetime";
import { errorMessage, fieldErrors } from "@/lib/organizer/errors";

/** Nilai mentah form (semua string, seperti di input). */
export interface EventValues {
  title: string;
  description: string;
  venueName: string;
  venueAddress: string;
  mapsUrl: string;
  startAt: string;
  endAt: string;
  timezone: string;
  checkInOpensAt: string;
  capacity: string;
  maxTicketsPerUser: string;
}

export const emptyEventValues: EventValues = {
  title: "",
  description: "",
  venueName: "",
  venueAddress: "",
  mapsUrl: "",
  startAt: "",
  endAt: "",
  timezone: "Asia/Jakarta",
  checkInOpensAt: "",
  capacity: "",
  maxTicketsPerUser: "",
};

export function valuesFromEvent(event: Event): EventValues {
  const tz = event.timezone;
  return {
    title: event.title,
    description: event.description ?? "",
    venueName: event.venueName,
    venueAddress: event.venueAddress ?? "",
    mapsUrl: event.mapsUrl ?? "",
    startAt: toLocalInput(event.startAt, tz),
    endAt: toLocalInput(event.endAt, tz),
    timezone: tz,
    // Nilai default (startAt − 2 jam) tidak ditampilkan supaya tetap ikut berubah kalau jam mulai digeser.
    checkInOpensAt: event.checkInOpensAtIsDefault ? "" : toLocalInput(event.checkInOpensAt, tz),
    capacity: event.capacity === null ? "" : String(event.capacity),
    maxTicketsPerUser: event.maxTicketsPerUser === null ? "" : String(event.maxTicketsPerUser),
  };
}

const optionalInt = (value: string) => (value.trim() === "" ? null : Number(value));

export function bodyFromValues(values: EventValues): EventBody {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    venueName: values.venueName.trim(),
    venueAddress: values.venueAddress.trim(),
    mapsUrl: values.mapsUrl.trim() || null,
    startAt: fromLocalInput(values.startAt, values.timezone) ?? "",
    endAt: fromLocalInput(values.endAt, values.timezone) ?? "",
    timezone: values.timezone,
    checkInOpensAt: fromLocalInput(values.checkInOpensAt, values.timezone),
    capacity: optionalInt(values.capacity),
    maxTicketsPerUser: optionalInt(values.maxTicketsPerUser),
  };
}

/** Field yang berbeda dari acara saat ini (JSON Merge Patch, kontrak §1.3). */
export function eventPatch(event: Event, values: EventValues): Partial<EventBody> {
  const next = bodyFromValues(values);
  const before = bodyFromValues(valuesFromEvent(event));
  const patch: Partial<EventBody> = {};
  for (const key of Object.keys(next) as Array<keyof EventBody>) {
    if (next[key] !== before[key]) (patch as Record<string, unknown>)[key] = next[key];
  }
  return patch;
}

const MAX_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

function isWholeNumberIn(value: string, min: number, max: number) {
  const number = Number(value);
  return /^\d+$/.test(value.trim()) && number >= min && number <= max;
}

/** Aturan kontrak §9.5 POST /events, dicek di browser supaya pesannya Bahasa Indonesia. */
export function validateEvent(values: EventValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const title = values.title.trim();
  if (title.length < 3 || title.length > 150) errors.title = "Judul 3–150 karakter.";
  if (values.description.length > 10000) errors.description = "Deskripsi maksimal 10.000 karakter.";
  const venue = values.venueName.trim();
  if (venue.length < 2 || venue.length > 150) errors.venueName = "Nama tempat 2–150 karakter.";
  if (values.venueAddress.length > 300) errors.venueAddress = "Alamat maksimal 300 karakter.";

  const maps = values.mapsUrl.trim();
  if (maps) {
    let valid = false;
    try {
      valid = new URL(maps).protocol === "https:";
    } catch {
      valid = false;
    }
    if (!valid || maps.length > 500) errors.mapsUrl = "Tautan peta harus diawali https://.";
  }

  const start = fromLocalInput(values.startAt, values.timezone);
  const end = fromLocalInput(values.endAt, values.timezone);
  if (!start) errors.startAt = "Isi tanggal dan jam mulai.";
  if (!end) errors.endAt = "Isi tanggal dan jam selesai.";
  if (start && end) {
    const duration = Date.parse(end) - Date.parse(start);
    if (duration <= 0) errors.endAt = "Jam selesai harus setelah jam mulai.";
    else if (duration > MAX_DURATION_MS) errors.endAt = "Acara maksimal 14 hari.";
  }
  const checkIn = fromLocalInput(values.checkInOpensAt, values.timezone);
  if (checkIn && end && Date.parse(checkIn) >= Date.parse(end)) errors.checkInOpensAt = "Check-in harus dibuka sebelum acara selesai.";

  if (values.capacity.trim() && !isWholeNumberIn(values.capacity, 1, 100000)) errors.capacity = "Angka 1–100.000.";
  if (values.maxTicketsPerUser.trim() && !isWholeNumberIn(values.maxTicketsPerUser, 1, 100)) errors.maxTicketsPerUser = "Angka 1–100.";
  return errors;
}

export function EventForm({
  initial,
  onSubmit,
  submitLabel,
  submitVariant = "dark",
  readOnly = false,
  aside,
  footer,
}: {
  initial: EventValues;
  /** Lempar error API supaya form bisa menampilkan pesan per field. */
  onSubmit: (values: EventValues) => Promise<void>;
  submitLabel: string;
  submitVariant?: "primary" | "dark";
  readOnly?: boolean;
  /** Kolom kanan (poster). */
  aside?: ReactNode;
  /** Teks kecil di samping tombol simpan. */
  footer?: ReactNode;
}) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof EventValues) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [key]: event.target.value }));
    if (errors[key]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const local = validateEvent(values);
    setErrors(local);
    setFormError(null);
    if (Object.keys(local).length) return;
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (error) {
      const fields = fieldErrors(error);
      setErrors(fields);
      // Detail validasi backend berbahasa Inggris; tampilkan ringkasan saja kalau sudah ada pesan per field.
      setFormError(Object.keys(fields).length ? "Periksa isian yang ditandai." : errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const timezoneOptions = TIMEZONES.some((zone) => zone.value === values.timezone)
    ? TIMEZONES
    : [...TIMEZONES, { value: values.timezone, label: values.timezone }];

  return (
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <fieldset disabled={readOnly || saving} className="flex min-w-0 flex-col gap-8 lg:col-span-8">
        <section className="flex flex-col gap-5">
          <h2 className="text-[20px] font-semibold">Tentang acara</h2>
          <Field name="title" label="Judul" value={values.title} onChange={set("title")} error={errors.title} maxLength={150} required />
          <TextArea
            name="description"
            label="Deskripsi"
            rows={8}
            value={values.description}
            onChange={set("description")}
            error={errors.description}
            hint="Wajib diisi sebelum acara diterbitkan."
          />
        </section>

        <section className="flex flex-col gap-5 border-t border-line pt-8">
          <h2 className="text-[20px] font-semibold">Tempat</h2>
          <Field name="venueName" label="Nama tempat" value={values.venueName} onChange={set("venueName")} error={errors.venueName} maxLength={150} required />
          <Field
            name="venueAddress"
            label="Alamat"
            value={values.venueAddress}
            onChange={set("venueAddress")}
            error={errors.venueAddress}
            maxLength={300}
            hint="Wajib diisi sebelum acara diterbitkan."
          />
          <Field
            name="mapsUrl"
            label="Tautan Google Maps (opsional)"
            type="url"
            inputMode="url"
            placeholder="https://maps.app.goo.gl/…"
            value={values.mapsUrl}
            onChange={set("mapsUrl")}
            error={errors.mapsUrl}
          />
        </section>

        <section className="flex flex-col gap-5 border-t border-line pt-8">
          <h2 className="text-[20px] font-semibold">Waktu</h2>
          <Select name="timezone" label="Zona waktu" value={values.timezone} onChange={set("timezone")} className="max-w-[280px]">
            {timezoneOptions.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:max-w-[520px]">
            <Field name="startAt" label="Mulai" type="datetime-local" value={values.startAt} onChange={set("startAt")} error={errors.startAt} required />
            <Field name="endAt" label="Selesai" type="datetime-local" value={values.endAt} onChange={set("endAt")} error={errors.endAt} required />
          </div>
          <Field
            name="checkInOpensAt"
            label="Check-in dibuka (opsional)"
            type="datetime-local"
            value={values.checkInOpensAt}
            onChange={set("checkInOpensAt")}
            error={errors.checkInOpensAt}
            hint="Kosongkan untuk 2 jam sebelum acara mulai."
            className="sm:max-w-[250px]"
          />
        </section>

        <section className="flex flex-col gap-5 border-t border-line pt-8">
          <h2 className="text-[20px] font-semibold">Batas tiket</h2>
          <div className="flex flex-wrap gap-5">
            <Field
              name="capacity"
              label="Kapasitas (opsional)"
              inputMode="numeric"
              value={values.capacity}
              onChange={set("capacity")}
              error={errors.capacity}
              hint="Batas total kuota semua tipe tiket."
              className="w-[220px]"
            />
            <Field
              name="maxTicketsPerUser"
              label="Maks. tiket per akun (opsional)"
              inputMode="numeric"
              value={values.maxTicketsPerUser}
              onChange={set("maxTicketsPerUser")}
              error={errors.maxTicketsPerUser}
              className="w-[220px]"
            />
          </div>
        </section>

        {!readOnly && (
          <div className="flex flex-col gap-4 border-t border-line pt-8">
            <FormError>{formError}</FormError>
            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" variant={submitVariant} loading={saving}>
                {submitLabel}
              </Button>
              {footer}
            </div>
          </div>
        )}
      </fieldset>

      {aside && <div className="order-first lg:order-last lg:col-span-4">{aside}</div>}
    </form>
  );
}
