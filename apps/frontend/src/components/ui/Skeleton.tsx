import { cn } from "@/lib/cn";

/** Blok abu-abu berdenyut untuk state loading. Atur ukuran lewat className. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-navy/10", className)} />;
}

/** Placeholder satu EventCard (poster 4:5 + tiga baris teks). */
export function EventCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="aspect-[4/5] w-full rounded-card" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3.5 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}
