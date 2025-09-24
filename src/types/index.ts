// Types for the scraping application
export interface ContactInfo {
  contacts: Contact[];
  // Legacy fields for backward compatibility
  phoneNumbers: string[];
  emailAddresses: string[];
  people: Person[];
}

export interface Contact {
  name: string;
  title: string;
  phone?: string;
  email?: string;
}

export interface Person {
  name: string;
  title: string;
}

export interface ScrapingResult {
  url: string;
  success: boolean;
  data?: ContactInfo;
  error?: string;
  timestamp: string;
}

export interface CSVRow {
  url: string;
  phoneNumbers?: string;
  emailAddresses?: string;
  people?: string;
  error?: string;
}
