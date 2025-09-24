'use client';

// Yhteystieto-raaputtaja - Finnish Company Contact Scraper
import React, { useState } from 'react';
import { ScrapingForm } from '@/components/ScrapingForm';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { ScrapingResult } from '@/types';
import { CSVUtils } from '@/utils/csvUtils';

export default function Home() {
  const [results, setResults] = useState<ScrapingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSingleUrlScrape = async (url: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const result: ScrapingResult = await response.json();
      setResults([result]);
    } catch (error) {
      console.error('Error scraping single URL:', error);
      const errorResult: ScrapingResult = {
        url,
        success: false,
        error: 'Verkkovirhe',
        timestamp: new Date().toISOString(),
      };
      setResults([errorResult]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchScrape = async (urls: string[]) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/scrape', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls }),
      });

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Error batch scraping:', error);
      const errorResults: ScrapingResult[] = urls.map(url => ({
        url,
        success: false,
        error: 'Verkkovirhe',
        timestamp: new Date().toISOString(),
      }));
      setResults(errorResults);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (results.length > 0) {
      const csvContent = CSVUtils.createCSVFromResults(results);
      CSVUtils.downloadCSV(csvContent, `yhteystieto-raaputus-${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Yhteystieto-raaputtaja
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Raaputa yhteystietoja suomalaisilta yrityssivuilta. 
            Löydä puhelinnumeroita, sähköpostiosoitteita ja henkilöitä automaattisesti.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Input Form */}
            <div>
              <ScrapingForm
                onSingleUrlScrape={handleSingleUrlScrape}
                onBatchScrape={handleBatchScrape}
                isLoading={isLoading}
              />
            </div>

            {/* Results */}
            <div>
              <ResultsDisplay
                results={results}
                onDownloadCSV={handleDownloadCSV}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-16 text-sm text-gray-500">
          <p>
            Tämä työkalu on suunniteltu käytettäväksi vastuullisesti ja 
            noudattamaan verkkosivujen käyttöehtoja.
          </p>
        </footer>
      </div>
    </div>
  );
}
