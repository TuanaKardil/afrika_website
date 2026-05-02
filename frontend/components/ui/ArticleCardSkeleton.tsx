export default function ArticleCardSkeleton() {
  return (
    <div className="flex flex-col rounded-sm bg-surface-container overflow-hidden animate-pulse border border-outline-variant">
      <div className="aspect-[16/10] bg-outline-variant" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-3 w-24 bg-outline-variant rounded-sm" />
        <div className="space-y-1.5">
          <div className="h-4 bg-outline-variant rounded-sm w-full" />
          <div className="h-4 bg-outline-variant rounded-sm w-4/5" />
          <div className="h-4 bg-outline-variant rounded-sm w-3/5" />
        </div>
      </div>
    </div>
  );
}
