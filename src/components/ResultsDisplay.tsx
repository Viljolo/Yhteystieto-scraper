'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Mail, User, Download, AlertCircle } from 'lucide-react';
import { ScrapingResult } from '@/types';
import { CSVUtils } from '@/utils/csvUtils';

interface ResultsDisplayProps {
  results: ScrapingResult[];
  onDownloadCSV: () => void;
}

export function ResultsDisplay({ results, onDownloadCSV }: ResultsDisplayProps) {
  if (results.length === 0) {
    return null;
  }

  const singleResult = results.length === 1 ? results[0] : null;
  const hasMultipleResults = results.length > 1;

  return (
    <div className="space-y-6">
      {/* Download CSV Button for multiple results */}
      {hasMultipleResults && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Raaputustulokset</h3>
                <p className="text-sm text-muted-foreground">
                  {results.length} sivua käsitelty
                </p>
              </div>
              <Button onClick={onDownloadCSV} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Lataa CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Single Result Display */}
      {singleResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {singleResult.success ? (
                <Badge variant="default">Onnistui</Badge>
              ) : (
                <Badge variant="destructive">Epäonnistui</Badge>
              )}
              {singleResult.url}
            </CardTitle>
            <CardDescription>
              Raaputettu: {new Date(singleResult.timestamp).toLocaleString('fi-FI')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {singleResult.success && singleResult.data ? (
              <div className="space-y-6">
                {/* Phone Numbers */}
                {singleResult.data.phoneNumbers.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-2 font-semibold mb-3">
                      <Phone className="h-4 w-4" />
                      Puhelinnumerot ({singleResult.data.phoneNumbers.length})
                    </h4>
                    <div className="space-y-2">
                      {singleResult.data.phoneNumbers.map((phone, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Badge variant="outline">{phone}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Email Addresses */}
                {singleResult.data.emailAddresses.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-2 font-semibold mb-3">
                      <Mail className="h-4 w-4" />
                      Sähköpostiosoitteet ({singleResult.data.emailAddresses.length})
                    </h4>
                    <div className="space-y-2">
                      {singleResult.data.emailAddresses.map((email, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Badge variant="outline">{email}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* People */}
                {singleResult.data.people.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-2 font-semibold mb-3">
                      <User className="h-4 w-4" />
                      Henkilöt ({singleResult.data.people.length})
                    </h4>
                    <div className="space-y-3">
                      {singleResult.data.people.map((person, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="font-medium">{person.name}</div>
                          <div className="text-sm text-muted-foreground">{person.title}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Data Found */}
                {singleResult.data.phoneNumbers.length === 0 && 
                 singleResult.data.emailAddresses.length === 0 && 
                 singleResult.data.people.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>Yhteystietoja ei löytynyt</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
                <p className="text-destructive font-medium">Raaputus epäonnistui</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {singleResult.error || 'Tuntematon virhe'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Multiple Results Summary */}
      {hasMultipleResults && (
        <div className="grid gap-4">
          {results.map((result, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <Badge variant="default">Onnistui</Badge>
                    ) : (
                      <Badge variant="destructive">Epäonnistui</Badge>
                    )}
                    <span className="font-medium truncate">{result.url}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(result.timestamp).toLocaleTimeString('fi-FI')}
                  </span>
                </div>
                
                {result.success && result.data ? (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {result.data.phoneNumbers.length} puhelinta
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {result.data.emailAddresses.length} sähköpostia
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {result.data.people.length} henkilöä
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-destructive">
                    {result.error || 'Tuntematon virhe'}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
