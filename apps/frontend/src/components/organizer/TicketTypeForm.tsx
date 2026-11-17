"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError, TextArea } from "@/components/ui/Field";
import type { Event, TicketType } from "@/types/api";
import { formatRupiah } from "@/lib/format";
import type { TicketTypeBody } from "@/lib/organizer/api";
import { fromLocalInput, toLocalInput } from "@/lib/organizer/datetime";
import { errorMessage, fieldErrors } from "@/lib/organizer/errors";

interface Values {
  name: string;
  description: string;
  price: string;
  quota: string;
  salesStartAt: string;
  salesEndAt: string;
  maxPerOrder: string;
  sortOrder: string;
  isActive: boolean;
}

/** "75.000" / "Rp 75000" → "75000". */
const digits = (value: string) => value.replace(/[^\d]/g, "");

function valuesFromType(type: TicketType, tz: string): Values {
  return {
    name: type.name,
    description: type.description ?? "",
    price: String(type.price),
    quota: String(type.quota),
    salesStartAt: toLocalInput(type.salesStartAt, tz),
    salesEndAt: toLocalInput(type.salesEndAt, tz),
    maxPerOrder: String(type.maxPerOrder),
    sortOrder: String(type.sortOrder),
    isActive: type.isActive,
  };
}

function initialValues(event: Event, type: TicketType | null): Values {
  const tz = event.timezone;
  if (type) return valuesFromType(type, tz);
  // Default: penjualan dibuka jam berikutnya dan ditutup saat acara mulai.
  const nextHour = new Date(Math.ceil(Date.now() / 3_600_000) * 3_600_000).toISOString();
  const types = event.ticketTypes ?? [];
  return {
    name: "",
    description: "",
    price: "",
    quota: "",
    salesStartAt: toLocalInput(nextHour, tz),
    salesEndAt: toLocalInput(event.startAt, tz),
    maxPerOrder: "5",
    sortOrder: String(types.length ? Math.min(999, Math.max(...types.map((item) => item.sortOrder)) + 1) : 0),
    isActive: true,
  };
}

function toBody(values: Values, timeZone: string): TicketTypeBody {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    price: Number(digits(values.price)),
    quota: Number(digits(values.quota)),
    salesStartAt: fromLocalInput(values.salesStartAt, timeZone) ?? "",
    salesEndAt: fromLocalInput(values.salesEndAt, timeZone) ?? "",
    maxPerOrder: Number(digits(values.maxPerOrder)),
    sortOrder: Number(digits(values.sortOrder)),
    isActive: values.isActive,
  };
}

const inRange = (raw: string, min: number, max: number) => {
  const value = digits(raw);
  return value !== "" && Number(value) >= min && Number(value) <= max;
};

/** Aturan kontrak §9.6 + cek kapasitas & kuota terjual. */
function validate(values: Values, event: Event, type: TicketType | null): Record<string, string> {
  const errors: Record<string, string> = {};
  const others = (event.ticketTypes ?? []).filter((item) => item.id !== type?.id);
  const name = values.name.trim();
  if (name.length < 2 || name.length > 50) errors.name = "Nama 2–50 karakter.";
  else if (others.some((item) => item.name.toLowerCase() === name.toLowerCase())) errors.name = "Nama ini sudah dipakai tipe tiket lain.";
  if (values.description.length > 500) errors.description = "Keterangan maksimal 500 karakter.";

  const price = digits(values.price);
  if (price === "") errors.price = "Isi harga. Tulis 0 untuk tiket gratis.";
  else if (Number(price) !== 0 && !inRange(price, 1000, 100_000_000)) errors.price = "Harga 0 (gratis) atau Rp1.000–Rp100.000.000.";

  if (!inRange(values.quota, 1, 100_000)) errors.quota = "Kuota 1–100.000.";
  else {
    const quota = Number(digits(values.quota));
    const used = (type?.soldCount ?? 0) + (type?.reservedCount ?? 0);
    const otherQuota = others.reduce((sum, item) => sum + item.quota, 0);
    if (type && quota < used) errors.quota = `Minimal ${used} (sudah terjual dan sedang dipesan).`;
    else if (event.capacity !== null && otherQuota + quota > event.capacity) {
      errors.quota = `Sisa kapasitas acara ${Math.max(0, event.capacity - otherQuota)}.`;
    }
  }

  const start = fromLocalInput(values.salesStartAt, event.timezone);
  const end = fromLocalInput(values.salesEndAt, event.timezone);
  if (!start) errors.salesStartAt = "Isi waktu mulai penjualan.";
  if (!end) errors.salesEndAt = "Isi waktu akhir penjualan.";
  if (start && end && Date.parse(end) <= Date.parse(start)) errors.salesEndAt = "Harus setelah penjualan dibuka.";
  else if (end && Date.parse(end) > Date.parse(event.endAt)) errors.salesEndAt = "Penjualan harus berakhir sebelum acara selesai.";

  if (!inRange(values.maxPerOrder, 1, 20)) errors.maxPerOrder = "Angka 1–20.";
  if (!inRange(values.sortOrder, 0, 999)) errors.sortOrder = "Angka 0–999.";
  return errors;
}

/** Patch hanya field yang berubah (JSON Merge Patch). */
function diff(next: TicketTypeBody, type: TicketType, timeZone: string): Partial<TicketTypeBody> {
  const before = toBody(valuesFromType(type, timeZone), timeZone);
  const patch: Partial<TicketTypeBody> = {};
  for (const key of Object.keys(next) as Array<keyof TicketTypeBody>) {
    if (next[key] !== before[key]) (patch as Record<string, unknown>)[key] = next[key];
  }
  return patch;
}

export function TicketTypeForm({
  event,
  type,
  onSave,
  onCancel,
}: {
  event: Event;
  /** null = tambah baru. */
  type: TicketType | null;
  /** create: body lengkap; edit: hanya field yang berubah. Lempar error API untuk ditampilkan di form. */
  onSave: (body: Partial<TicketTypeBody>) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(() => initialValues(event, type));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const prefix = type ? `tt-${type.id}` : "tt-new";

  const set = (key: Exclude<keyof Values, "isActive">) => (changeEvent: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [key]: changeEvent.target.value }));
    if (errors[key]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  };

  async function submit(formEvent: FormEvent) {
    formEvent.preventDefault();
    const local = validate(values, event, type);
    setErrors(local);
    setFormError(null);
    if (Object.keys(local).length) return;
    const body = toBody(values, event.timezone);
    const payload = type ? diff(body, type, event.timezone) : body;
    if (type && Object.keys(payload).length === 0) return onCancel();
    setSaving(true);
    try {
      await onSave(payload);
    } catch (error) {
      const fields = fieldErrors(error);
      if (Object.keys(fields).length) {
        setErrors(fields);
        setFormError("Periksa isian yang ditandai.");
      } else {
        setFormError(errorMessage(error, "Tipe tiket gagal disimpan."));
      }
      setSaving(false);
    }
  }

  const priceDigits = digits(values.price);
  const used = (type?.soldCount ?? 0) + (type?.reservedCount ?? 0);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-card border border-line bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[20px] font-semibold">{type ? `Ubah ${type.name}` : "Tipe tiket baru"}</h2>
        <button type="button" onClick={onCancel} className="text-[14px] font-semibold text-muted underline-offset-4 hover:text-navy hover:underline">
          Tutup
        </button>
      </div>

      {type && used > 0 && (
        <p className="text-[14px] text-muted">
          {type.soldCount ?? 0} terjual, {type.reservedCount ?? 0} sedang dipesan. Harga baru hanya berlaku untuk pesanan berikutnya.
        </p>
      )}

      <Field id={`${prefix}-name`} name="name" label="Nama" placeholder="Presale, Reguler, VIP" value={values.name} onChange={set("name")} error={errors.name} maxLength={50} />
      <TextArea
        id={`${prefix}-description`}
        name="description"
        label="Keterangan (opsional)"
        rows={2}
        maxLength={500}
        value={values.description}
        onChange={set("description")}
        error={errors.description}
      />
      <div className="flex flex-wrap gap-5">
        <Field
          id={`${prefix}-price`}
          name="price"
          label="Harga (Rp)"
          inputMode="numeric"
          value={values.price}
          onChange={set("price")}
          error={errors.price}
          hint={priceDigits === "" ? "0 untuk gratis." : formatRupiah(Number(priceDigits))}
          className="w-[160px]"
        />
        <Field
          id={`${prefix}-quota`}
          name="quota"
          label="Kuota"
          inputMode="numeric"
          value={values.quota}
          onChange={set("quota")}
          error={errors.quota}
          className="w-[140px]"
        />
      </div>
      <Field
        id={`${prefix}-salesStartAt`}
        name="salesStartAt"
        label="Penjualan dibuka"
        type="datetime-local"
        value={values.salesStartAt}
        onChange={set("salesStartAt")}
        error={errors.salesStartAt}
      />
      <Field
        id={`${prefix}-salesEndAt`}
        name="salesEndAt"
        label="Penjualan ditutup"
        type="datetime-local"
        value={values.salesEndAt}
        onChange={set("salesEndAt")}
        error={errors.salesEndAt}
        hint={`Waktu ${event.timezone}. Paling lambat saat acara selesai.`}
      />
      <div className="flex flex-wrap gap-5">
        <Field
          id={`${prefix}-maxPerOrder`}
          name="maxPerOrder"
          label="Maks. per pesanan"
          inputMode="numeric"
          value={values.maxPerOrder}
          onChange={set("maxPerOrder")}
          error={errors.maxPerOrder}
          className="w-[140px]"
        />
        <Field
          id={`${prefix}-sortOrder`}
          name="sortOrder"
          label="Urutan tampil"
          inputMode="numeric"
          value={values.sortOrder}
          onChange={set("sortOrder")}
          error={errors.sortOrder}
          hint="Kecil tampil dulu."
          className="w-[140px]"
        />
      </div>
      <label className="flex items-start gap-3 text-[15px]">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(changeEvent) => setValues((current) => ({ ...current, isActive: changeEvent.target.checked }))}
          className="mt-1 size-4 accent-navy"
        />
        <span>
          <span className="font-semibold">Aktif</span>
          <span className="block text-[14px] text-muted">Tipe nonaktif tidak tampil dan tidak bisa dibeli. Pesanan yang sudah ada tetap berlaku.</span>
        </span>
      </label>

      <FormError>{formError}</FormError>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="dark" loading={saving}>
          {type ? "Simpan" : "Tambah tipe tiket"}
        </Button>
        <Button variant="text" onClick={onCancel} disabled={saving}>
          Batal
        </Button>
      </div>
    </form>
  );
}
