import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HomeIcon, AlertTriangleIcon } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative">
          <div className="absolute -inset-4 bg-red-500/10 rounded-full blur-3xl opacity-70 animate-pulse-slow" />
          <AlertTriangleIcon size={80} className="text-amber-500 relative z-10" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight animate-slide-up" style={{animationDelay: "100ms"}}>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-red-500">
            Page Not Found
          </span>
        </h1>
        
        <p className="text-lg text-muted-foreground max-w-md animate-slide-up" style={{animationDelay: "150ms"}}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        
        <div className="flex gap-4 mt-4 animate-slide-up" style={{animationDelay: "200ms"}}>
          <Link href="/">
            <Button className="flex items-center gap-2 transition-all duration-200">
              <HomeIcon size={16} />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 