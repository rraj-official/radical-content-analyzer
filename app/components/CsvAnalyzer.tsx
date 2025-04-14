'use client';

import { useState } from 'react';
import { analyzeUrlsFromCSV, processWebsite } from '@/app/actions/serverActions';

type AnalysisResult = {
  url: string;
  output_json: string;
  overall_score: number | 'N/A';
  status: 'to_process' | 'processing' | 'success' | 'error';
  screenshot_url: string;
  sts_url: string;
};

export default function CsvAnalyzer() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      setCurrentIndex(-1);

      const content = await file.text();
      const { urls, totalUrls } = await analyzeUrlsFromCSV(content);

      const initialResults = urls.map((url: string) => ({
        url,
        output_json: 'Waiting...',
        overall_score: 'N/A' as const,
        status: 'to_process' as const,
        screenshot_url: '',
        sts_url: ''
      }));
      setResults(initialResults);

      // Process each website one by one
      for (let i = 0; i < urls.length; i++) {
        setCurrentIndex(i);
        
        setResults(prev => prev.map((result, idx) => 
          idx === i ? { ...result, status: 'processing', output_json: 'Processing...', screenshot_url: '', sts_url: '' } : result
        ));

        const result = await processWebsite(urls[i]);
        
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...result, screenshot_url: result.screenshot_url, sts_url: result.sts_url } : r
        ));

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
      setCurrentIndex(-1);
    }
  };

  const handleDownload = () => {
    // Create CSV content
    const headers = ['url', 'status', 'overall_score', 'output_json'].join(',');
    const rows = results.map(result => [
      result.url,
      result.status,
      result.overall_score,
      `"${result.output_json.replace(/"/g, '""')}"` // Escape quotes in JSON
    ].join(','));
    
    const csvContent = [headers, ...rows].join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-results-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Bulk Website Analysis</h2>
        {results.length > 0 && (
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Download Results
          </button>
        )}
      </div>
      
      <div className="mb-4">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={isProcessing}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-violet-50 file:text-violet-700
            hover:file:bg-violet-100"
        />
      </div>

      {isProcessing && (
        <div className="text-blue-600 mb-4">
          Processing website {currentIndex + 1} of {results.length}...
        </div>
      )}

      {error && (
        <div className="text-red-600 mb-4">
          Error: {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Screenshot
                </th>
                <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {results.map((result, index) => (
                <tr key={index} className={index === currentIndex ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <a href={`/analysis/${result.sts_url}`} target="_blank">
                      {result.url}
                    </a>
                  </td>
                  <td className="flex justify-center items-center">
                    {result.screenshot_url && (
                      <img src={result.screenshot_url} alt="Screenshot" className="w-16 object-cover rounded-sm" />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${result.status === 'to_process' ? 'bg-gray-100 text-gray-800' :
                        result.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        result.status === 'success' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'}`}>
                      {result.status === 'to_process' ? 'Waiting' :
                        result.status === 'processing' ? 'Processing' :
                        result.status === 'success' ? 'Success' : 'Error'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.overall_score}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                    {result.status === 'to_process' ? 'Waiting...' :
                      result.status === 'processing' ? 
                        <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div> :
                        result.output_json}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 