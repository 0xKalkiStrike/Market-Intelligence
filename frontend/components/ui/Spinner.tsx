export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return <span className={`${className} inline-block animate-spin rounded-full border-2 border-slate-300 border-t-slate-900`} />;
}

export function PageLoading() {
  return (
    <div className="flex h-full min-h-[300px] items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
