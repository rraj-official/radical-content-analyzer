import HeroSection from "@/components/HeroSection";
import { GlobeIcon, FileIcon, InfoIcon } from "lucide-react";
import InputForm from "@/components/InputForm";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  return (
    <div className="flex flex-col items-center w-full gap-10">
      <HeroSection />
      <InputForm />
    </div>
  );
}
