import { NextRequest, NextResponse } from 'next/server';
import { CSVUtils } from '@/utils/csvUtils';

/**
 * API endpoint for processing CSV file uploads
 * POST /api/upload/csv
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Read file content
    const csvContent = await file.text();
    
    // Parse URLs from CSV
    const urls = await CSVUtils.parseCSVUrls(csvContent);

    if (urls.length === 0) {
      return NextResponse.json(
        { error: 'No valid URLs found in CSV file' },
        { status: 400 }
      );
    }

    if (urls.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 URLs allowed per CSV file' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      urls,
      count: urls.length 
    });
  } catch (error) {
    console.error('CSV upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process CSV file' },
      { status: 500 }
    );
  }
}
