export default function ArticleCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl bg-surface-container overflow-hidden animate-pulse">
      <div className="aspect-video bg-outline-variant" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-4 w-20 bg-outline-variant rounded-full" />
        <div className="space-y-2">
          <div className="h-5 bg-outline-variant rounded w-full" />
          <div className="h-5 bg-outline-variant rounded w-4/5" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3.5 bg-outline-variant rounded w-full" />
          <div className="h-3.5 bg-outline-variant rounded w-3/4" />
        </div>
        <div className="mt-auto pt-2 border-t border-outline-variant flex justify-between">
          <div className="h-3 w-24 bg-outline-variant rounded" />
          <div className="h-3 w-16 bg-outline-variant rounded" />
        </div>
      </div>
    </div>
  );
}
