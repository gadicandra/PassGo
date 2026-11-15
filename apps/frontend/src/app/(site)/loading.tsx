import { EventCardSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function CatalogLoading() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-8 md:py-12" aria-busy aria-label="Memuat acara">
      <Skeleton className="h-[360px] w-full rounded-2xl md:h-[440px]" />
      <div className="mt-8 flex gap-3">
        {[80, 104, 96, 80].map((width) => (
          <Skeleton key={width} className="h-10 rounded-lg" style={{ width }} />
        ))}
      </div>
      <Skeleton className="mt-10 h-10 w-56" />
      <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
