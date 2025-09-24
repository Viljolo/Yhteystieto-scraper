# Yhteystieto-raaputtaja

A modern web scraping application designed to extract contact information from Finnish company websites. Built with Next.js, TypeScript, and deployed on Vercel's free tier.

## Features

- **Single URL Scraping**: Extract contact information from individual websites
- **Batch Processing**: Upload CSV files with multiple URLs for bulk processing
- **Finnish-Optimized**: Specifically designed for Finnish company websites and contact patterns
- **Modern UI**: Clean, responsive interface built with shadcn/ui components
- **Export Results**: Download results as CSV files
- **Serverless Architecture**: Optimized for Vercel's free tier deployment

## Extracted Information

The scraper extracts the following types of contact information:

- **Phone Numbers** (Puhelinnumerot)
  - Finnish phone number formats (+358, 040, etc.)
  - Handles various formatting styles
  - Extracts from `tel:` links and text content

- **Email Addresses** (Sähköpostiosoitteet)
  - Standard email format validation
  - Extracts from `mailto:` links and text content
  - Case-insensitive processing

- **People Information** (Henkilötiedot)
  - Names of people associated with the company
  - Job titles and positions
  - Finnish job title recognition

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Scraping**: Cheerio, Axios
- **CSV Processing**: csv-parser, csv-writer
- **Deployment**: Vercel (serverless functions)
- **Icons**: Lucide React

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # Serverless API routes
│   │   ├── scrape/        # Scraping endpoints
│   │   └── upload/        # File upload endpoints
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── ScrapingForm.tsx  # Input form component
│   └── ResultsDisplay.tsx # Results display component
├── lib/                  # Core utilities
│   ├── scraper.ts        # Main scraping logic
│   └── utils.ts          # Utility functions
├── types/                # TypeScript type definitions
│   └── index.ts
└── utils/                # Helper utilities
    └── csvUtils.ts       # CSV processing utilities
```

## Installation & Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd yhteystieto-scraper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## Usage

### Single URL Scraping

1. Enter a URL in the "Yksittäinen URL" section
2. Click "Aloita raaputus" to start scraping
3. View the extracted contact information on the right panel

### Batch Processing

1. Prepare a CSV file with URLs in the first column
2. Upload the CSV file using the "CSV-tiedosto" section
3. The application will automatically process all URLs
4. Download the results as a CSV file

### CSV Format

Your CSV file should have URLs in the first column:

```csv
URL
https://example1.com
https://example2.com
https://example3.com
```

## API Endpoints

### POST `/api/scrape`
Scrapes a single URL.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "url": "https://example.com",
  "success": true,
  "data": {
    "phoneNumbers": ["+358 40 123 4567"],
    "emailAddresses": ["info@example.com"],
    "people": [
      {
        "name": "Matti Meikäläinen",
        "title": "Toimitusjohtaja"
      }
    ]
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### PUT `/api/scrape`
Scrapes multiple URLs in batch.

**Request:**
```json
{
  "urls": ["https://example1.com", "https://example2.com"]
}
```

**Response:**
```json
{
  "results": [
    {
      "url": "https://example1.com",
      "success": true,
      "data": { ... },
      "timestamp": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

### POST `/api/upload`
Processes CSV file uploads.

**Request:** Multipart form data with `file` field

**Response:**
```json
{
  "success": true,
  "urls": ["https://example1.com", "https://example2.com"],
  "count": 2
}
```

## Deployment on Vercel

### Automatic Deployment

1. **Connect to Vercel**
   - Push your code to GitHub/GitLab/Bitbucket
   - Connect your repository to Vercel
   - Deploy automatically

2. **Manual Deployment**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

### Configuration

The application is pre-configured for Vercel with:

- **Serverless Functions**: API routes run as serverless functions
- **Edge Runtime**: Optimized for global performance
- **Automatic Scaling**: Handles traffic spikes automatically
- **Free Tier Limits**: 
  - 100GB bandwidth per month
  - 100 serverless function executions per day
  - 1GB memory per function

## Scraping Logic

### Phone Number Detection

The scraper recognizes various Finnish phone number formats:

- `+358 40 123 4567` (International format)
- `040 123 4567` (National format)
- `040-123-4567` (With dashes)
- `040.123.4567` (With dots)

### Email Detection

Standard email validation with support for:
- `mailto:` links
- Text content extraction
- Case-insensitive processing

### People Detection

Identifies Finnish names and job titles by:
- Pattern recognition for Finnish names
- Common job title keywords
- Context analysis around contact sections

## Limitations & Considerations

### Technical Limits

- **Rate Limiting**: 5 concurrent requests to prevent overwhelming servers
- **Timeout**: 10-second timeout per request
- **File Size**: Maximum 5MB CSV files
- **URL Limit**: Maximum 50 URLs per batch

### Ethical Considerations

- **Respect robots.txt**: Always check website robots.txt files
- **Rate Limiting**: Built-in delays to avoid overwhelming servers
- **Terms of Service**: Respect website terms of service
- **Data Privacy**: Handle extracted data responsibly

### Known Limitations

- Some websites may block automated requests
- Dynamic content (JavaScript-rendered) may not be captured
- Complex authentication-protected content is not supported
- Some websites may have anti-bot measures

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue on GitHub or contact the development team.

## Changelog

### Version 1.0.0
- Initial release
- Single URL and batch CSV processing
- Finnish-optimized scraping logic
- Modern UI with shadcn/ui components
- Vercel deployment ready

---

**Note**: This tool is designed for legitimate business purposes. Always ensure you have permission to scrape websites and comply with applicable laws and website terms of service.
