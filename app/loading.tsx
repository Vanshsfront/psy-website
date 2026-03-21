export default function Loading() {
  return (
    <div className="fixed inset-0 bg-ink z-[100] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-taupe/40 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 bg-taupe/40 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 bg-taupe/40 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  )
}
