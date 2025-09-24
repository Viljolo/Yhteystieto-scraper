'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Globe, Download, Loader2 } from 'lucide-react';
import { ScrapingResult } from '@/types';
import { CSVUtils } from '@/utils/csvUtils';

interface ScrapingFormProps {
  onSingleUrlScrape: (url: string) => Promise<void>;
  onBatchScrape: (urls: string[]) => Promise<void>;
  isLoading: boolean;
}

export function ScrapingForm({ onSingleUrlScrape, onBatchScrape, isLoading }: ScrapingFormProps) {
  const [singleUrl, setSingleUrl] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSingleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (singleUrl.trim()) {
      await onSingleUrlScrape(singleUrl.trim());
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      
      // Process the CSV file immediately
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        const result = await response.json();
        
        if (result.success) {
          await onBatchScrape(result.urls);
        } else {
          alert(`Error processing CSV: ${result.error}`);
        }
      } catch (error) {
        console.error('Error uploading CSV:', error);
        alert('Error processing CSV file');
      }
    }
  };

  const clearFile = () => {
    setCsvFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Single URL Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Yksittäinen URL
          </CardTitle>
          <CardDescription>
            Syötä yksi URL-osoite raaputettavaksi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSingleUrlSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL-osoite</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                value={singleUrl}
                onChange={(e) => setSingleUrl(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button 
              type="submit" 
              disabled={!singleUrl.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Raaputetaan...
                </>
              ) : (
                'Aloita raaputus'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* CSV Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            CSV-tiedosto
          </CardTitle>
          <CardDescription>
            Lataa CSV-tiedosto, jossa on URL-osoitteita ensimmäisessä sarakkeessa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV-tiedosto</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="flex-1"
                />
                {csvFile && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearFile}
                    disabled={isLoading}
                  >
                    Tyhjennä
                  </Button>
                )}
              </div>
              {csvFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              <p>• Maksimi 50 URL-osoitetta per tiedosto</p>
              <p>• Maksimi tiedostokoko 5 MB</p>
              <p>• URL-osoitteet ensimmäisessä sarakkeessa</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
