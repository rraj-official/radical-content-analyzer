import CsvAnalyzer from '@/app/components/CsvAnalyzer';

export default function BulkAnalysisPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Bulk Website Analysis</h1>
      <CsvAnalyzer />
    </div>
  );
} 