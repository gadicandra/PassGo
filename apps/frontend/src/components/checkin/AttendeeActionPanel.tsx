"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError, TextArea } from "@/components/ui/Field";

export type ActionKind = "revert" | "reissue";

const copy: Record<ActionKind, { title: string; hint: string; confirm: string; placeholder: string }> = {
  revert: {
    title: "Batalkan check-in",
    hint: "Tiket kembali berstatus berlaku dan bisa dipindai lagi. Dicatat di log audit.",
    confirm: "Batalkan check-in",
    placeholder: "Mis. salah pindai tiket teman",
  },
  reissue: {
    title: "Terbitkan ulang kode tiket",
    hint: "Kode lama langsung tidak berlaku. Kode baru dikirim ke email pembeli. Dicatat di log audit.",
    confirm: "Terbitkan ulang",
    placeholder: "Mis. screenshot tiket tersebar di media sosial",
  },
};

function validateReason(value: string): string | undefined {
  const reason = value.trim();
  if (reason.length < 5) return "Alasan minimal 5 karakter.";
  if (reason.length > 500) return "Alasan maksimal 500 karakter.";
  return undefined;
}

export function AttendeeActionPanel({
  kind,
  holderName,
  onSubmit,
  onCancel,
}: {
  kind: ActionKind;
  holderName: string;
  onSubmit: (reason: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const text = copy[kind];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const problem = validateReason(reason);
    setFieldError(problem);
    setFormError(undefined);
    if (problem) return;
    setBusy(true);
    try {
      await onSubmit(reason.trim());
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Aksi gagal. Coba lagi.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 border-t border-line bg-navy/[0.03] px-4 py-4 md:px-6">
      <p className="font-semibold">
        {text.title}: {holderName}
      </p>
      <TextArea
        name={`reason-${kind}`}
        label="Alasan"
        value={reason}
        onChange={(event) => {
          setReason(event.target.value);
          if (fieldError) setFieldError(validateReason(event.target.value));
        }}
        onBlur={() => setFieldError(validateReason(reason))}
        error={fieldError}
        hint={text.hint}
        placeholder={text.placeholder}
        rows={2}
        maxLength={500}
        className="max-w-xl"
        required
      />
      <FormError>{formError}</FormError>
      <div className="flex gap-3">
        <Button type="submit" variant="dark" size="sm" loading={busy}>
          {text.confirm}
        </Button>
        <Button variant="text" onClick={onCancel} disabled={busy}>
          Batal
        </Button>
      </div>
    </form>
  );
}
