import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';

export function CSVImporter({ portfolioId }: { portfolioId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [count, setCount] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file || !portfolioId) return;
    setStatus('loading');
    
    try {
      const text = await file.text();
      const response = await fetch(`/api/portfolio/import?portfolioId=${portfolioId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: text
      });
      
      const data = await response.json();
      if (data.success) {
        setCount(data.count);
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Portfolio Importer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input type="file" accept=".csv" onChange={handleFileChange} className="text-xs" />
          <Button size="sm" onClick={handleUpload} disabled={!file || status === 'loading'}>
            <Upload className="h-4 w-4 mr-2" /> Import
          </Button>
        </div>
        
        {status === 'success' && (
          <div className="flex items-center gap-2 text-xs text-gain bg-gain/10 p-2 rounded-md">
            <CheckCircle2 className="h-4 w-4" /> Successfully imported {count} records.
          </div>
        )}
        
        {status === 'error' && (
          <div className="flex items-center gap-2 text-xs text-loss bg-loss/10 p-2 rounded-md">
            <AlertCircle className="h-4 w-4" /> Failed to parse CSV.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
