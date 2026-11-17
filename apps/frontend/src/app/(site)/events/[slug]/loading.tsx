import { Skeleton } from "@/components/ui/Skeleton";

export default function EventDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-8 md:px-8 md:pt-12" aria-busy aria-label="Memuat acara">
      <Skeleton className="h-[300px] w-full rounded-2xl md:h-[380px]" />
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-7">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <Skeleton className="h-[360px] rounded-card lg:col-span-5" />
      </div>
    </div>
  );
}
