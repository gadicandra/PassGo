"use client";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function ToastDemo() {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" size="sm" onClick={() => toast.success("Tiket berhasil dibeli")}>
        Toast sukses
      </Button>
      <Button variant="outline" size="sm" onClick={() => toast.error("Kuota tiket tidak mencukupi")}>
        Toast error
      </Button>
      <Button variant="outline" size="sm" onClick={() => toast.info("Pembayaran sedang dicek")}>
        Toast info
      </Button>
    </div>
  );
}
