import CsvAnalyzer from '@/app/components/CsvAnalyzer';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function BulkAnalysisPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Bulk Website Analysis</h1>
      <CsvAnalyzer />
    </div>
  );
} 