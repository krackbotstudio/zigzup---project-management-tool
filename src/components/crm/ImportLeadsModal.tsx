import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Link2, FileSpreadsheet, X, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCRM } from '@/context/CRMContext';
import { ImportRow } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── CSV parser (handles quoted fields) ───────────────────
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const nx = text[i + 1];
    if (ch === '"' && inQuotes && nx === '"') { field += '"'; i++; }
    else if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { row.push(field.trim()); field = ''; }
    else if ((ch === '\n' || (ch === '\r' && nx === '\n')) && !inQuotes) {
      if (ch === '\r') i++;
      row.push(field.trim()); rows.push(row); row = []; field = '';
    } else if (ch !== '\r') { field += ch; }
  }
  if (field || row.length) { row.push(field.trim()); rows.push(row); }
  return rows.filter(r => r.some(f => f !== ''));
}

// ── Sheet parser (returns header + data rows) ─────────────
function sheetToRows(sheet: XLSX.WorkSheet): string[][] {
  const json: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  return json.filter((r: string[]) => r.some(c => String(c) !== ''));
}

// ── Google Sheets URL → gviz CSV ─────────────────────────
function toGvizUrl(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return null;
  return `https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv`;
}

// ── CRM field options for mapping ─────────────────────────
const CRM_FIELDS = [
  { value: '',           label: '— Skip —' },
  { value: 'name',       label: 'Name *' },
  { value: 'email',      label: 'Email' },
  { value: 'phone',      label: 'Phone' },
  { value: 'company',    label: 'Company' },
  { value: 'website',    label: 'Website' },
  { value: 'dealValue',  label: 'Deal Value' },
  { value: 'stage',      label: 'Stage' },
  { value: 'source',     label: 'Source' },
  { value: 'currency',   label: 'Currency' },
];

type Step = 'source' | 'preview' | 'mapping' | 'done';
type SourceType = 'csv' | 'excel' | 'sheets';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ImportLeadsModal({ open, onClose }: Props) {
  const { bulkImportLeads } = useCRM();

  const [step, setStep]           = useState<Step>('source');
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [headers, setHeaders]     = useState<string[]>([]);
  const [dataRows, setDataRows]   = useState<string[][]>([]);
  const [mapping, setMapping]     = useState<Record<number, string>>({});  // col idx → crmField
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<{ created: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('source'); setSourceType(null); setSheetsUrl('');
    setHeaders([]); setDataRows([]); setMapping({}); setResult(null);
  };
  const close = () => { reset(); onClose(); };

  // Auto-guess field mapping from header names
  const guessMapping = (hdrs: string[]): Record<number, string> => {
    const map: Record<number, string> = {};
    const aliases: Record<string, string> = {
      name: 'name', 'full name': 'name', 'first name': 'name', fullname: 'name',
      email: 'email', 'e-mail': 'email', 'email address': 'email',
      phone: 'phone', 'phone number': 'phone', mobile: 'phone', tel: 'phone',
      company: 'company', 'company name': 'company', organization: 'company', org: 'company',
      website: 'website', url: 'website', 'web site': 'website',
      'deal value': 'dealValue', value: 'dealValue', amount: 'dealValue', revenue: 'dealValue',
      stage: 'stage', status: 'stage',
      source: 'source', 'lead source': 'source',
      currency: 'currency',
    };
    hdrs.forEach((h, i) => {
      const key = h.toLowerCase().trim();
      if (aliases[key]) map[i] = aliases[key];
    });
    return map;
  };

  const loadData = (rows: string[][]) => {
    if (rows.length < 2) { toast.error('File appears empty or has only headers'); return; }
    const hdrs = rows[0].map(h => String(h));
    const data = rows.slice(1);
    setHeaders(hdrs);
    setDataRows(data);
    setMapping(guessMapping(hdrs));
    setStep('preview');
  };

  // ── File handlers ─────────────────────────────────────
  const handleCSV = (file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      loadData(parseCSV(text));
      setLoading(false);
    };
    reader.readAsText(file);
  };

  const handleExcel = (file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = e => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      loadData(sheetToRows(ws));
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSheetsUrl = async () => {
    const gviz = toGvizUrl(sheetsUrl.trim());
    if (!gviz) { toast.error('Invalid Google Sheets URL'); return; }
    setLoading(true);
    try {
      const res = await fetch(gviz);
      if (!res.ok) throw new Error('Could not fetch. Make sure the sheet is public (Anyone with the link → Viewer).');
      const text = await res.text();
      loadData(parseCSV(text));
    } catch (err: any) {
      toast.error('Google Sheets fetch failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || file.type === 'text/csv') {
      setSourceType('csv'); handleCSV(file);
    } else if (ext === 'xlsx' || ext === 'xls' || file.type.includes('spreadsheet')) {
      setSourceType('excel'); handleExcel(file);
    } else {
      toast.error('Unsupported file type. Upload a .csv or .xlsx/.xls file.');
    }
  };

  // ── Run import ─────────────────────────────────────────
  const runImport = async () => {
    setLoading(true);
    const rows: ImportRow[] = dataRows.map(row => {
      const obj: ImportRow = {};
      Object.entries(mapping).forEach(([colIdx, field]) => {
        if (field) obj[field] = String(row[Number(colIdx)] ?? '').trim() || undefined;
      });
      return obj;
    });
    try {
      const res = await bulkImportLeads(rows);
      setResult(res);
      setStep('done');
      toast.success(`Imported ${res.created} lead${res.created !== 1 ? 's' : ''}`);
    } catch (err: any) {
      toast.error('Import failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) close(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Import Leads
          </DialogTitle>
        </DialogHeader>

        {/* ── Step: Source ── */}
        {step === 'source' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Choose your data source:</p>

            {/* File drop zone */}
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Drop your file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Supports CSV, Excel (.xlsx, .xls)</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            {/* Google Sheets */}
            <div className="border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Link2 className="w-4 h-4 text-primary" />
                Import from Google Sheets URL
              </div>
              <p className="text-xs text-muted-foreground">Paste a public sheet URL (File → Share → Anyone with the link)</p>
              <div className="flex gap-2">
                <Input
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetsUrl}
                  onChange={e => setSheetsUrl(e.target.value)}
                  className="text-xs h-8"
                />
                <Button size="sm" onClick={handleSheetsUrl} disabled={!sheetsUrl.trim() || loading} className="h-8 shrink-0">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Fetch'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step: Preview ── */}
        {step === 'preview' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{dataRows.length} rows found. Showing first 5:</p>
            <div className="overflow-auto rounded-lg border border-border max-h-48">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {dataRows.slice(0, 5).map((row, ri) => (
                    <tr key={ri} className="hover:bg-muted/20">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-3 py-1.5 truncate max-w-[120px]">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={reset}>Back</Button>
              <Button size="sm" onClick={() => setStep('mapping')}>
                Map Fields <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Field mapping ── */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Map your columns to CRM fields. Fields marked <span className="text-destructive">*</span> are required.
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {headers.map((h, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-40 truncate shrink-0" title={h}>{h}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <select
                    value={mapping[i] ?? ''}
                    onChange={e => setMapping(prev => ({ ...prev, [i]: e.target.value }))}
                    className="flex-1 text-xs bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:border-primary"
                  >
                    {CRM_FIELDS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  {/* Preview value */}
                  <span className="text-[11px] text-muted-foreground/60 w-32 truncate shrink-0">
                    e.g. {dataRows[0]?.[i] ?? ''}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-muted-foreground">{dataRows.length} rows to import</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep('preview')}>Back</Button>
                <Button
                  size="sm"
                  onClick={runImport}
                  disabled={loading || !Object.values(mapping).includes('name')}
                >
                  {loading
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Importing…</>
                    : `Import ${dataRows.length} leads`
                  }
                </Button>
              </div>
            </div>
            {!Object.values(mapping).includes('name') && (
              <p className="text-xs text-destructive">Please map at least the "Name" field to proceed.</p>
            )}
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === 'done' && result && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <div>
              <p className="text-lg font-bold">{result.created} leads imported!</p>
              {result.skipped > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {result.skipped} rows skipped (missing name or invalid data)
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reset}>Import more</Button>
              <Button size="sm" onClick={close}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
