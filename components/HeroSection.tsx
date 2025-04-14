import Image from "next/image";

export default function HeroSection() {
  return (
    <div className="flex flex-col items-center gap-8 py-6 md:py-10 w-full max-w-5xl mx-auto">
      <div className="relative animate-fade-in">
        {/* <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-violet-500/20 rounded-full blur-3xl opacity-70 animate-pulse-slow" /> */}
        <Image
          src="/images/hero-image.png"
          alt="hero-image"
          width={280}
          height={280}
          className="rounded-xl relative z-10"
          priority
        />
      </div>
      
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight animate-slide-up">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-red-500 dark:from-red-400 dark:to-red-400">
            Radical Content Analyzer
          </span>
        </h1>
        
        <p className="text-base md:text-lg text-muted-foreground max-w-xl animate-slide-up" style={{animationDelay: "100ms"}}>
          This tool analyzes video content to detect if it contains radical or extremist content.
        </p>
        
        <h2 className="text-xl md:text-2xl mt-4 animate-slide-up" style={{animationDelay: "150ms"}}>
          <span className="text-blue-600 dark:text-blue-500 dark:from-blue-400 dark:to-violet-400">
            Get a detailed research-backed analysis
          </span>
        </h2>
      </div>
    </div>
  );
}
