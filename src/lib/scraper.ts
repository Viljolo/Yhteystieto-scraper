import * as cheerio from 'cheerio';
import axios from 'axios';
import { ContactInfo, Contact, Person } from '@/types';

/**
 * Main scraper class for extracting Finnish company contact information
 */
export class FinnishCompanyScraper {
  private readonly userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];
  
  /**
   * Scrapes contact information from a Finnish company website
   * @param url - The URL to scrape
   * @returns Promise<ContactInfo> - Extracted contact information
   */
  async scrapeContactInfo(url: string): Promise<ContactInfo> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Validate URL
        if (!this.isValidUrl(url)) {
          throw new Error('Invalid URL provided');
        }

        // Add delay between retries
        if (attempt > 1) {
          await this.delay(1000 * attempt); // Progressive delay: 2s, 3s
        }

        // Randomize user agent
        const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];

        // Add random delay to mimic human behavior
        await this.delay(Math.random() * 1000 + 500); // 0.5-1.5 seconds

        // Try different approaches based on attempt
        let response;
        if (attempt === 1) {
          // First attempt: Full browser simulation
          response = await this.fetchWithFullHeaders(url, userAgent);
        } else if (attempt === 2) {
          // Second attempt: Minimal headers
          response = await this.fetchWithMinimalHeaders(url, userAgent);
        } else {
          // Third attempt: Simple request
          response = await this.fetchSimple(url);
        }

        // Check if we got a valid response
        if (response.status >= 400) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const $ = cheerio.load(response.data);
        
        // Extract grouped contact information
        const contacts = this.extractGroupedContacts($);
        
        // Extract legacy separate data for backward compatibility
        const phoneNumbers = this.extractPhoneNumbers($);
        const emailAddresses = this.extractEmailAddresses($);
        const people = this.extractPeople($);

        // Log what we found for debugging
        console.log(`Successfully scraped ${url}:`, {
          contacts: contacts.length,
          phoneNumbers: phoneNumbers.length,
          emailAddresses: emailAddresses.length,
          people: people.length,
          pageTitle: $('title').text().substring(0, 50)
        });

        return {
          contacts,
          phoneNumbers,
          emailAddresses,
          people,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Attempt ${attempt}/${maxRetries} failed for ${url}:`, {
          error: lastError.message,
          type: error instanceof Error ? error.constructor.name : 'Unknown',
          status: (error as any)?.response?.status,
          statusText: (error as any)?.response?.statusText,
          headers: (error as any)?.response?.headers
        });
        
        // Don't retry for certain types of errors
        if (this.isNonRetryableError(lastError)) {
          console.log(`Not retrying ${url} due to non-retryable error: ${lastError.message}`);
          break;
        }
      }
    }

    // If all retries failed, throw the last error
    throw new Error(`Failed to scrape ${url} after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Adds a delay between requests
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch with full browser headers (most realistic)
   */
  private async fetchWithFullHeaders(url: string, userAgent: string) {
    return await axios.get(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'fi-FI,fi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'DNT': '1',
        'Referer': 'https://www.google.com/',
      },
      timeout: 20000,
      maxRedirects: 10,
      validateStatus: (status) => status < 500,
    });
  }

  /**
   * Fetch with minimal headers (less detectable)
   */
  private async fetchWithMinimalHeaders(url: string, userAgent: string) {
    return await axios.get(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fi-FI,fi;q=0.9,en;q=0.8',
        'Connection': 'keep-alive',
      },
      timeout: 25000,
      maxRedirects: 15,
      validateStatus: (status) => status < 500,
    });
  }

  /**
   * Simple fetch (fallback)
   */
  private async fetchSimple(url: string) {
    return await axios.get(url, {
      timeout: 30000,
      maxRedirects: 20,
      validateStatus: (status) => status < 500,
    });
  }

  /**
   * Determines if an error should not be retried
   */
  private isNonRetryableError(error: Error): boolean {
    const nonRetryablePatterns = [
      'Invalid URL',
      '404',
      '403',
      '401',
      '400',
      'ENOTFOUND',
      'ECONNREFUSED'
    ];
    
    return nonRetryablePatterns.some(pattern => 
      error.message.includes(pattern)
    );
  }

  /**
   * Validates if the provided string is a valid URL
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extracts grouped contact information by analyzing contact sections
   * This method tries to associate names, titles, phones, and emails together
   */
  private extractGroupedContacts($: cheerio.CheerioAPI): Contact[] {
    const contacts: Contact[] = [];
    
    // Common selectors for contact sections - expanded list
    const contactSelectors = [
      'section[class*="contact"]',
      'section[class*="team"]',
      'section[class*="henkilöstö"]',
      'section[class*="staff"]',
      'section[class*="employee"]',
      'section[class*="person"]',
      'div[class*="contact"]',
      'div[class*="team"]',
      'div[class*="henkilöstö"]',
      'div[class*="staff"]',
      'div[class*="employee"]',
      'div[class*="person"]',
      'div[class*="yhteystiedot"]',
      'div[class*="henkilökunta"]',
      '.contact-info',
      '.contact-details',
      '.team-member',
      '.staff-member',
      '.employee-card',
      '.person-card',
      '.contact-card',
      '.contact-item',
      '.team-item',
      '.staff-item',
      '.person-item',
      '#contact',
      '#team',
      '#henkilöstö',
      '#henkilökunta',
      '#yhteystiedot',
      '[data-contact]',
      '[data-team-member]',
      '[data-staff-member]',
      'footer', // Often contains contact info
      'address', // HTML address element
      '.footer-contact',
      '.contact-section',
      '.team-section',
      '.staff-section'
    ];

    contactSelectors.forEach(selector => {
      $(selector).each((_, element) => {
        const contactData = this.extractContactFromElement($, $(element));
        if (contactData) {
          contacts.push(contactData);
        }
      });
    });

    // Also look for individual contact cards/items
    $('.contact-item, .team-item, .person, .staff, .member, .employee, .worker').each((_, element) => {
      const contactData = this.extractContactFromElement($, $(element));
      if (contactData) {
        contacts.push(contactData);
      }
    });

    // Look for any div/section that contains both a name and contact info
    $('div, section, article').each((_, element) => {
      const $el = $(element);
      const text = $el.text();
      
      // Check if this element contains both a name pattern and contact info
      const hasName = /\b[A-ZÄÖÅ][a-zäöå]+ [A-ZÄÖÅ][a-zäöå]+/.test(text);
      const hasPhone = /(\+358|0)[0-9\s\-\.]{8,}/.test(text);
      const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
      
      if (hasName && (hasPhone || hasEmail)) {
        const contactData = this.extractContactFromElement($, $el);
        if (contactData) {
          contacts.push(contactData);
        }
      }
    });

    // Remove duplicates and return unique contacts
    return this.removeDuplicateContacts(contacts);
  }

  /**
   * Extracts contact information from a specific element
   */
  private extractContactFromElement($: cheerio.CheerioAPI, $element: cheerio.Cheerio<any>): Contact | null {
    const text = $element.text();
    const html = $element.html() || '';
    
    // Extract name (Finnish name pattern) - more flexible
    const namePatterns = [
      /\b[A-ZÄÖÅ][a-zäöå]+ [A-ZÄÖÅ][a-zäöå]+(?:\s[A-ZÄÖÅ][a-zäöå]+)?\b/, // Finnish names
      /\b[A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?\b/, // International names
      /\b[A-ZÄÖÅ][a-zäöå]+\s+[A-ZÄÖÅ][a-zäöå]+\b/ // Simpler pattern
    ];
    
    let name: string | null = null;
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) {
        name = match[0].trim();
        break;
      }
    }
    
    if (!name) return null;
    
    // Extract title from common Finnish job titles
    const titleKeywords = [
      'toimitusjohtaja', 'tj', 'ceo', 'managing director',
      'myyntipäällikkö', 'sales manager', 'myynti',
      'markkinointipäällikkö', 'marketing manager', 'markkinointi',
      'asiakaspalvelupäällikkö', 'customer service manager',
      'henkilöstöpäällikkö', 'hr manager', 'henkilöstö',
      'talouspäällikkö', 'financial manager', 'talous',
      'projektipäällikkö', 'project manager', 'projekti',
      'tiimipäällikkö', 'team leader', 'tiimi',
      'päällikkö', 'manager', 'johtaja', 'director',
      'asiantuntija', 'specialist', 'konsultti', 'consultant',
      'kehittäjä', 'developer', 'suunnittelija', 'designer',
      'avustaja', 'assistant', 'koordinaattori', 'coordinator'
    ];
    
    let title = 'Tuntematon';
    for (const keyword of titleKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        title = keyword;
        break;
      }
    }
    
    // Extract phone number from this element
    const phonePatterns = [
      /(\+358\s?[0-9]{2}\s?[0-9]{3}\s?[0-9]{4})/g,
      /(0[0-9]{1,2}\s?[0-9]{3}\s?[0-9]{4})/g,
      /(0[0-9]{1,2}-[0-9]{3}-[0-9]{4})/g,
      /(0[0-9]{1,2}\.[0-9]{3}\.[0-9]{4})/g,
    ];
    
    let phone: string | undefined;
    for (const pattern of phonePatterns) {
      const match = text.match(pattern);
      if (match && this.isValidPhoneNumber(match[0])) {
        phone = this.normalizePhoneNumber(match[0]);
        break;
      }
    }
    
    // Extract email from this element
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailMatch = text.match(emailPattern);
    const email = emailMatch && this.isValidEmail(emailMatch[0]) 
      ? emailMatch[0].toLowerCase() 
      : undefined;
    
    // Return contact if we have a name (even without contact methods for better coverage)
    if (name) {
      return {
        name,
        title,
        phone,
        email,
      };
    }
    
    return null;
  }

  /**
   * Removes duplicate contacts based on name similarity
   */
  private removeDuplicateContacts(contacts: Contact[]): Contact[] {
    const uniqueContacts: Contact[] = [];
    
    contacts.forEach(contact => {
      const isDuplicate = uniqueContacts.some(existing => 
        existing.name.toLowerCase() === contact.name.toLowerCase()
      );
      
      if (!isDuplicate) {
        uniqueContacts.push(contact);
      }
    });
    
    return uniqueContacts.slice(0, 10); // Limit to 10 contacts
  }

  /**
   * Extracts phone numbers from the webpage
   * Handles various Finnish phone number formats
   */
  private extractPhoneNumbers($: cheerio.CheerioAPI): string[] {
    const phoneNumbers = new Set<string>();
    
    // Finnish phone number patterns
    const phonePatterns = [
      /(\+358\s?[0-9]{2}\s?[0-9]{3}\s?[0-9]{4})/g, // +358 40 123 4567
      /(0[0-9]{1,2}\s?[0-9]{3}\s?[0-9]{4})/g, // 040 123 4567 or 09 123 4567
      /(0[0-9]{1,2}-[0-9]{3}-[0-9]{4})/g, // 040-123-4567
      /(0[0-9]{1,2}\.[0-9]{3}\.[0-9]{4})/g, // 040.123.4567
    ];

    // Extract from tel: links
    $('a[href^="tel:"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        const phone = href.replace('tel:', '').trim();
        if (this.isValidPhoneNumber(phone)) {
          phoneNumbers.add(this.normalizePhoneNumber(phone));
        }
      }
    });

    // Extract from text content
    const textContent = $('body').text();
    phonePatterns.forEach(pattern => {
      const matches = textContent.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const phone = match.trim();
          if (this.isValidPhoneNumber(phone)) {
            phoneNumbers.add(this.normalizePhoneNumber(phone));
          }
        });
      }
    });

    return Array.from(phoneNumbers);
  }

  /**
   * Extracts email addresses from the webpage
   */
  private extractEmailAddresses($: cheerio.CheerioAPI): string[] {
    const emailAddresses = new Set<string>();
    
    // Email pattern
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

    // Extract from mailto: links
    $('a[href^="mailto:"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        const email = href.replace('mailto:', '').trim();
        if (this.isValidEmail(email)) {
          emailAddresses.add(email.toLowerCase());
        }
      }
    });

    // Extract from text content
    const textContent = $('body').text();
    const matches = textContent.match(emailPattern);
    if (matches) {
      matches.forEach(match => {
        const email = match.trim();
        if (this.isValidEmail(email)) {
          emailAddresses.add(email.toLowerCase());
        }
      });
    }

    return Array.from(emailAddresses);
  }

  /**
   * Extracts people information (names and titles) from the webpage
   * Focuses on Finnish company structures and common patterns
   */
  private extractPeople($: cheerio.CheerioAPI): Person[] {
    const people: Person[] = [];
    
    // Common Finnish job titles and keywords
    const titleKeywords = [
      'toimitusjohtaja', 'tj', 'ceo', 'managing director',
      'myyntipäällikkö', 'sales manager', 'myynti',
      'markkinointipäällikkö', 'marketing manager', 'markkinointi',
      'asiakaspalvelupäällikkö', 'customer service manager',
      'henkilöstöpäällikkö', 'hr manager', 'henkilöstö',
      'talouspäällikkö', 'financial manager', 'talous',
      'projektipäällikkö', 'project manager', 'projekti',
      'tiimipäällikkö', 'team leader', 'tiimi',
      'päällikkö', 'manager', 'johtaja', 'director',
      'asiantuntija', 'specialist', 'konsultti', 'consultant',
      'kehittäjä', 'developer', 'suunnittelija', 'designer',
      'avustaja', 'assistant', 'koordinaattori', 'coordinator'
    ];

    // Look for contact sections, team sections, and about pages
    const contactSelectors = [
      'section[class*="contact"]',
      'section[class*="team"]',
      'section[class*="henkilöstö"]',
      'div[class*="contact"]',
      'div[class*="team"]',
      'div[class*="henkilöstö"]',
      '.contact-info',
      '.team-member',
      '.staff-member',
      '#contact',
      '#team',
      '#henkilöstö'
    ];

    contactSelectors.forEach(selector => {
      $(selector).each((_, element) => {
        const sectionText = $(element).text().toLowerCase();
        
        // Find potential names (Finnish names typically have 2-3 words)
        const namePattern = /\b[A-ZÄÖÅ][a-zäöå]+ [A-ZÄÖÅ][a-zäöå]+(?:\s[A-ZÄÖÅ][a-zäöå]+)?\b/g;
        const names = sectionText.match(namePattern);
        
        if (names) {
          names.forEach(name => {
            const cleanName = name.trim();
            if (cleanName.length > 3 && cleanName.length < 50) {
              // Try to find associated title
              const title = this.findAssociatedTitle(sectionText, titleKeywords);
              people.push({
                name: cleanName,
                title: title || 'Tuntematon'
              });
            }
          });
        }
      });
    });

    // Remove duplicates based on name
    const uniquePeople = people.filter((person, index, self) => 
      index === self.findIndex(p => p.name.toLowerCase() === person.name.toLowerCase())
    );

    return uniquePeople.slice(0, 10); // Limit to 10 people to avoid noise
  }

  /**
   * Finds associated job title for a person based on context
   */
  private findAssociatedTitle(text: string, titleKeywords: string[]): string | null {
    for (const keyword of titleKeywords) {
      if (text.includes(keyword)) {
        return keyword;
      }
    }
    return null;
  }

  /**
   * Validates if a string is a valid phone number
   */
  private isValidPhoneNumber(phone: string): boolean {
    // Remove all non-digit characters except +
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    
    // Check if it's a valid Finnish phone number
    return /^(\+358|0)[0-9]{8,9}$/.test(cleanPhone) || 
           /^(\+358|0)[0-9]{2}\s?[0-9]{3}\s?[0-9]{4}$/.test(phone);
  }

  /**
   * Normalizes phone number format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    
    // Convert to standard format
    if (cleanPhone.startsWith('+358')) {
      return cleanPhone;
    } else if (cleanPhone.startsWith('0')) {
      return '+358' + cleanPhone.substring(1);
    }
    
    return phone; // Return original if can't normalize
  }

  /**
   * Validates if a string is a valid email address
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }
}
