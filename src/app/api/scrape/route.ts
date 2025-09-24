import { NextRequest, NextResponse } from 'next/server';
import { FinnishCompanyScraper } from '@/lib/scraper';
import { ScrapingResult } from '@/types';

/**
 * API endpoint for scraping a single URL
 * POST /api/scrape
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const scraper = new FinnishCompanyScraper();
    const data = await scraper.scrapeContactInfo(url);

    const result: ScrapingResult = {
      url,
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Scraping error:', error);
    
    const result: ScrapingResult = {
      url: (await request.json()).url || 'unknown',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result, { status: 500 });
  }
}

/**
 * API endpoint for scraping multiple URLs from CSV
 * POST /api/scrape/batch
 */
export async function PUT(request: NextRequest) {
  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: 'URLs array is required' },
        { status: 400 }
      );
    }

    if (urls.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 URLs allowed per batch' },
        { status: 400 }
      );
    }

    const scraper = new FinnishCompanyScraper();
    const results: ScrapingResult[] = [];

    // Process URLs in parallel with concurrency limit
    const concurrencyLimit = 5;
    const chunks = [];
    
    for (let i = 0; i < urls.length; i += concurrencyLimit) {
      chunks.push(urls.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (url: string) => {
        try {
          const data = await scraper.scrapeContactInfo(url);
          return {
            url,
            success: true,
            data,
            timestamp: new Date().toISOString(),
          } as ScrapingResult;
        } catch (error) {
          return {
            url,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          } as ScrapingResult;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Batch scraping error:', error);
    return NextResponse.json(
      { error: 'Batch scraping failed' },
      { status: 500 }
    );
  }
}
