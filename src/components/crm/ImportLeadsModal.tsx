import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Link2, FileSpreadsheet, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
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

function sheetToRows(sheet: XLSX.WorkSheet): string[][] {
  const json: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  return (json as string[][]).filter(r => r.some(c => String(c) !== ''));
}

function toGvizUrl(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return null;
  return `https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv`;
}

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

// Column-name aliases for auto-guessing the mapping
const ALIASES: Record<string, string> = {
  name: 'name', 'full name': 'name', 'first name': 'name', fullname: 'name',
  title: 'name', 'business name': 'name', 'company name': 'company',
  email: 'email', 'e-mail': 'email', 'email address': 'email',
  phone: 'phone', 'phone number': 'phone', mobile: 'phone', tel: 'phone',
  company: 'company', organization: 'company', org: 'company',
  website: 'website', url: 'website', 'web site': 'website',
  'deal value': 'dealValue', value: 'dealValue', amount: 'dealValue', revenue: 'dealValue',
  stage: 'stage', status: 'stage',
  source: 'source', 'lead source': 'source',
  currency: 'currency',
};

type Step = 'source' | 'preview' | 'mapping' | 'done';

// Step breadcrumb labels
const STEP_LABELS: Step[] = ['source', 'preview', 'mapping', 'done'];
const STEP_DISPLAY: Record<Step, string> = {
  source: 'Source', preview: 'Preview', mapping: 'Map Fields', done: 'Done',
};

interface Props { open: boolean; onClose: () => void; }

export function ImportLeadsModal({ open, onClose }: Props) {
  const { bulkImportLeads } = useCRM();

  const [step, setStep]           = useState<Step>('source');
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [headers, setHeaders]     = useState<string[]>([]);
  const [dataRows, setDataRows]   = useState<string[][]>([]);
  const [mapping, setMapping]     = useState<Record<number, string>>({});
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<{ created: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('source'); setSheetsUrl('');
    setHeaders([]); setDataRows([]); setMapping([]); setResult(null);
  };
  const close = () => { reset(); onClose(); };

  const guessMapping = (hdrs: string[]): Record<number, string> => {
    const map: Record<number, string> = {};
    hdrs.forEach((h, i) => {
      const key = h.toLowerCase().trim();
      if (ALIASES[key]) map[i] = ALIASES[key];
    });
    return map;
  };

  const loadData = (rows: string[][]) => {
    if (rows.length < 2) { toast.error('File appears empty or has no data rows'); return; }
    const hdrs = rows[0].map(h => String(h));
    const data = rows.slice(1);
    setHeaders(hdrs);
    setDataRows(data);
    setMapping(guessMapping(hdrs));
    setStep('preview');
  };

  const handleCSV = (file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = e => { loadData(parseCSV(e.target?.result as string)); setLoading(false); };
    reader.readAsText(file);
  };

  const handleExcel = (file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = e => {
      const wb = XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), { type: 'array' });
      loadData(sheetToRows(wb.Sheets[wb.SheetNames[0]]));
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
      if (!res.ok) throw new Error('Could not fetch. Make sure the sheet is publicly shared (Anyone with link → Viewer).');
      loadData(parseCSV(await res.text()));
    } catch (err: any) {
      toast.error('Google Sheets fetch failed', { description: err.message });
    } finally { setLoading(false); }
  };

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || file.type === 'text/csv') handleCSV(file);
    else if (ext === 'xlsx' || ext === 'xls' || file.type.includes('spreadsheet')) handleExcel(file);
    else toast.error('Unsupported file type. Upload a .csv or .xlsx/.xls file.');
  };

  const runImport = async () => {
    setLoading(true);
    const rows: ImportRow[] = dataRows.map(row => {
      const obj: ImportRow = {};
      Object.entries(mapping).forEach(([ci, field]) => {
        if (field) obj[field] = String(row[Number(ci)] ?? '').trim() || undefined;
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
    } finally { setLoading(false); }
  };

  const hasNameMapped = Object.values(mapping).includes('name');

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) close(); }}>
      {/*
        Flex column with capped height so footer buttons are always visible.
        The body section gets flex-1 + overflow-y-auto to scroll internally.
      */}
      <DialogContent className="max-w-2xl flex flex-col gap-0 max-h-[85vh] p-0 overflow-hidden">
        {/* ── Fixed header ─────────────────────────────── */}
        <div className="flex flex-col gap-3 px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Import Leads
            </DialogTitle>
          </DialogHeader>

          {/* Step breadcrumb */}
          {step !== 'done' && (
            <div className="flex items-center gap-1.5">
              {STEP_LABELS.filter(s => s !== 'done').map((s, i, arr) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span className={cn(
                    'text-xs font-medium',
                    step === s ? 'text-primary' : 'text-muted-foreground/50'
                  )}>
                    {STEP_DISPLAY[s]}
                  </span>
                  {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Scrollable body ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">

          {/* Step: Source */}
          {step === 'source' && (
            <div className="space-y-4">
              {/* File drop zone */}
              <div
                className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              >
                {loading
                  ? <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  : <Upload className="w-8 h-8 text-muted-foreground" />}
                <div className="text-center">
                  <p className="text-sm font-medium">{loading ? 'Parsing file…' : 'Drop your file here or click to browse'}</p>
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
                  Import from Google Sheets
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste a public sheet URL (File → Share → Anyone with the link → Viewer)
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={sheetsUrl}
                    onChange={e => setSheetsUrl(e.target.value)}
                    className="text-xs h-8"
                    onKeyDown={e => { if (e.key === 'Enter') handleSheetsUrl(); }}
                  />
                  <Button size="sm" onClick={handleSheetsUrl} disabled={!sheetsUrl.trim() || loading} className="h-8 shrink-0">
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Fetch'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{dataRows.length} rows</span> detected.
                Showing first 5 — proceed to map columns to CRM fields.
              </p>
              <div className="overflow-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 sticky top-0">
                    <tr>
                      {headers.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap border-b border-border">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {dataRows.slice(0, 5).map((row, ri) => (
                      <tr key={ri} className="hover:bg-muted/20">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-2 whitespace-nowrap max-w-[160px] truncate" title={cell}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step: Mapping */}
          {step === 'mapping' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Map your columns to CRM fields. At minimum, map the <span className="font-semibold text-foreground">Name</span> column.
              </p>
              <div className="space-y-2">
                {headers.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 border-b border-border/30 last:border-0">
                    <div className="w-40 shrink-0">
                      <p className="text-xs font-medium text-foreground truncate" title={h}>{h}</p>
                      <p className="text-[10px] text-muted-foreground/60 truncate">e.g. {String(dataRows[0]?.[i] ?? '')}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    <select
                      value={mapping[i] ?? ''}
                      onChange={e => setMapping(prev => ({ ...prev, [i]: e.target.value }))}
                      className={cn(
                        'flex-1 text-xs bg-background border rounded-md px-2 py-1.5 outline-none transition-colors',
                        mapping[i] ? 'border-primary/60 text-foreground' : 'border-border text-muted-foreground'
                      )}
                    >
                      {CRM_FIELDS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && result && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <CheckCircle2 className="w-14 h-14 text-emerald-500" />
              <div>
                <p className="text-xl font-bold">{result.created} leads imported!</p>
                {result.skipped > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.skipped} rows skipped (missing name or invalid data)
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Fixed footer ─────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
          {/* Left side info */}
          <div className="text-xs text-muted-foreground">
            {step === 'preview' && `${dataRows.length} rows ready`}
            {step === 'mapping' && !hasNameMapped && (
              <span className="text-destructive">Map the "Name" field to continue</span>
            )}
            {step === 'mapping' && hasNameMapped && `${dataRows.length} rows will be imported`}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {step === 'source' && (
              <Button variant="outline" size="sm" onClick={close}>Cancel</Button>
            )}
            {step === 'preview' && (
              <>
                <Button variant="outline" size="sm" onClick={reset}>Back</Button>
                <Button size="sm" onClick={() => setStep('mapping')}>
                  Map Fields <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </>
            )}
            {step === 'mapping' && (
              <>
                <Button variant="outline" size="sm" onClick={() => setStep('preview')}>Back</Button>
                <Button
                  size="sm"
                  onClick={runImport}
                  disabled={loading || !hasNameMapped}
                >
                  {loading
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Importing…</>
                    : `Import ${dataRows.length} leads`}
                </Button>
              </>
            )}
            {step === 'done' && (
              <>
                <Button variant="outline" size="sm" onClick={reset}>Import more</Button>
                <Button size="sm" onClick={close}>Done</Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
