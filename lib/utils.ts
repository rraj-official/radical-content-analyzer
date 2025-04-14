import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getScoreColor(score: number) {
  if (score < 30) return 'text-red-500';
  if (score < 70) return 'text-yellow-500';
  return 'text-green-500';
}

export function getProbabilityColor(probability: number) {
  if (probability > 0.7) return 'text-red-500';
  if (probability > 0.3) return 'text-yellow-500';
  return 'text-green-500';
}

export function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

export function extractDomain(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch (error) {
    return url;
  }
}

// Simulates API delay for mock data
export function simulateApiDelay(ms: number = 1500) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
