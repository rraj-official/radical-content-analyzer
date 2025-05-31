'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative">
          <div className="absolute -inset-4 bg-red-500/10 rounded-full blur-3xl opacity-70 animate-pulse-slow" />
          <div className="text-red-500 relative z-10 text-6xl">⚠️</div>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight animate-slide-up" style={{animationDelay: "100ms"}}>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">
            Something went wrong!
          </span>
        </h1>
        
        <p className="text-lg text-muted-foreground max-w-md animate-slide-up" style={{animationDelay: "150ms"}}>
          An unexpected error occurred. Please try again.
        </p>
        
        <div className="flex gap-4 mt-4 animate-slide-up" style={{animationDelay: "200ms"}}>
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all duration-200"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-all duration-200"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
} 