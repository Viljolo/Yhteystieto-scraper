import * as cheerio from 'cheerio';
import axios from 'axios';
import { ContactInfo, Contact, Person } from '@/types';

/**
 * Main scraper class for extracting Finnish company contact information
 */
export class FinnishCompanyScraper {
  private readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  
  /**
   * Scrapes contact information from a Finnish company website
   * @param url - The URL to scrape
   * @returns Promise<ContactInfo> - Extracted contact information
   */
  async scrapeContactInfo(url: string): Promise<ContactInfo> {
    try {
      // Validate URL
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL provided');
      }

      // Fetch the webpage
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'fi-FI,fi;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 10000, // 10 second timeout
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);
      
      // Extract grouped contact information
      const contacts = this.extractGroupedContacts($);
      
      // Extract legacy separate data for backward compatibility
      const phoneNumbers = this.extractPhoneNumbers($);
      const emailAddresses = this.extractEmailAddresses($);
      const people = this.extractPeople($);

      return {
        contacts,
        phoneNumbers,
        emailAddresses,
        people,
      };
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      throw new Error(`Failed to scrape ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    
    // Common selectors for contact sections
    const contactSelectors = [
      'section[class*="contact"]',
      'section[class*="team"]',
      'section[class*="henkilöstö"]',
      'div[class*="contact"]',
      'div[class*="team"]',
      'div[class*="henkilöstö"]',
      'div[class*="staff"]',
      'div[class*="employee"]',
      '.contact-info',
      '.team-member',
      '.staff-member',
      '.employee-card',
      '.person-card',
      '#contact',
      '#team',
      '#henkilöstö',
      '[data-contact]',
      '[data-team-member]'
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
    $('.contact-item, .team-item, .person, .staff').each((_, element) => {
      const contactData = this.extractContactFromElement($, $(element));
      if (contactData) {
        contacts.push(contactData);
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
    
    // Extract name (Finnish name pattern)
    const nameMatch = text.match(/\b[A-ZÄÖÅ][a-zäöå]+ [A-ZÄÖÅ][a-zäöå]+(?:\s[A-ZÄÖÅ][a-zäöå]+)?\b/);
    if (!nameMatch) return null;
    
    const name = nameMatch[0].trim();
    
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
    
    // Only return contact if we have at least name and one contact method
    if (name && (phone || email)) {
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
