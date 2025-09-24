import csv from 'csv-parser';
import { Readable } from 'stream';
import { ScrapingResult, CSVRow } from '@/types';

/**
 * Utility functions for CSV file handling
 */
export class CSVUtils {
  /**
   * Parses CSV content and extracts URLs from the first column
   * @param csvContent - The CSV file content as string
   * @returns Promise<string[]> - Array of URLs
   */
  static async parseCSVUrls(csvContent: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const urls: string[] = [];
      const stream = Readable.from([csvContent]);
      
      stream
        .pipe(csv())
        .on('data', (row) => {
          // Get the first column value (assuming it contains URLs)
          const firstColumnValue = Object.values(row)[0] as string;
          if (firstColumnValue && this.isValidUrl(firstColumnValue.trim())) {
            urls.push(firstColumnValue.trim());
          }
        })
        .on('end', () => {
          resolve(urls);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Creates CSV content from scraping results
   * @param results - Array of scraping results
   * @returns string - CSV content
   */
  static createCSVFromResults(results: ScrapingResult[]): string {
    const headers = ['URL', 'Name', 'Title', 'Phone', 'Email', 'Error'];
    const rows: string[][] = [];

    results.forEach(result => {
      if (result.success && result.data) {
        // If we have grouped contacts, use them
        if (result.data.contacts.length > 0) {
          result.data.contacts.forEach(contact => {
            const row: string[] = [
              result.url,
              contact.name,
              contact.title,
              contact.phone || '',
              contact.email || '',
              '' // No error
            ];
            rows.push(row);
          });
        } else {
          // Fallback to legacy separate data
          const row: string[] = [
            result.url,
            result.data.people.map(p => p.name).join('; ') || '',
            result.data.people.map(p => p.title).join('; ') || '',
            result.data.phoneNumbers.join('; '),
            result.data.emailAddresses.join('; '),
            '' // No error
          ];
          rows.push(row);
        }
      } else {
        // Error case
        const row: string[] = [
          result.url,
          '', '', '', '',
          result.error || 'Unknown error'
        ];
        rows.push(row);
      }
    });

    // Escape CSV values
    const escapedRows = rows.map(row => 
      row.map(cell => this.escapeCSVValue(cell))
    );

    return [headers.join(','), ...escapedRows.map(row => row.join(','))].join('\n');
  }

  /**
   * Escapes CSV values to handle commas, quotes, and newlines
   * @param value - The value to escape
   * @returns string - Escaped value
   */
  private static escapeCSVValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Validates if a string is a valid URL
   * @param url - The URL to validate
   * @returns boolean - True if valid URL
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Downloads CSV content as a file
   * @param csvContent - The CSV content
   * @param filename - The filename for download
   */
  static downloadCSV(csvContent: string, filename: string = 'scraping-results.csv'): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
