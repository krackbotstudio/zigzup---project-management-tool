import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, Link2, FileSpreadsheet, ChevronRight, Loader2,
  CheckCircle2, AlertTriangle, Trash2, SkipForward, RefreshCw,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCRM } from '@/context/CRMContext';
import { ImportRow, CRMLeadWithCard } from '@/types';
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
  { value: '',             label: '— Skip —',       group: '' },
  { value: 'name',         label: 'Name *',          group: 'Lead' },
  { value: 'stage',        label: 'Stage',           group: 'Lead' },
  { value: 'dealValue',    label: 'Deal Value',      group: 'Lead' },
  { value: 'source',       label: 'Source',          group: 'Lead' },
  { value: 'currency',     label: 'Currency',        group: 'Lead' },
  { value: 'email',        label: 'Email',           group: 'Contact' },
  { value: 'phone',        label: 'Phone',           group: 'Contact' },
  { value: 'company',      label: 'Company',         group: 'Contact' },
  { value: 'website',      label: 'Website',         group: 'Contact' },
  { value: 'tags',         label: 'Tags (comma-sep)', group: 'Contact' },
  { value: 'street',       label: 'Street / Address', group: 'Address' },
  { value: 'city',         label: 'City',            group: 'Address' },
  { value: 'state',        label: 'State / Province', group: 'Address' },
  { value: 'country',      label: 'Country',         group: 'Address' },
  { value: 'zip',          label: 'ZIP / Postal',    group: 'Address' },
  { value: 'rating',       label: 'Rating / Score',  group: 'Extra' },
  { value: 'reviewsCount', label: 'Reviews Count',   group: 'Extra' },
  { value: 'notes',        label: 'Notes',           group: 'Extra' },
];

const ALIASES: Record<string, string> = {
  name: 'name', 'full name': 'name', 'first name': 'name', fullname: 'name',
  title: 'name', 'business name': 'name', 'lead name': 'name',
  business: 'name', store: 'name', 'store name': 'name', shop: 'name',
  contact: 'name', 'contact name': 'name', person: 'name',
  email: 'email', 'e-mail': 'email', 'email address': 'email', 'contact email': 'email',
  phone: 'phone', 'phone number': 'phone', mobile: 'phone', tel: 'phone',
  telephone: 'phone', 'cell phone': 'phone', 'mobile number': 'phone',
  company: 'company', 'company name': 'company', organization: 'company', org: 'company',
  employer: 'company',
  website: 'website', url: 'website', 'web site': 'website', 'web url': 'website', link: 'website',
  'deal value': 'dealValue', value: 'dealValue', amount: 'dealValue',
  revenue: 'dealValue', budget: 'dealValue', price: 'dealValue', cost: 'dealValue',
  stage: 'stage', status: 'stage', 'lead stage': 'stage', pipeline: 'stage',
  source: 'source', 'lead source': 'source', channel: 'source', 'traffic source': 'source',
  currency: 'currency',
  street: 'street', address: 'street', 'street address': 'street', 'address line 1': 'street',
  addr: 'street', location: 'street',
  city: 'city', town: 'city', locality: 'city',
  state: 'state', province: 'state', region: 'state',
  country: 'country', 'country code': 'country', countrycode: 'country', nation: 'country',
  zip: 'zip', 'zip code': 'zip', postal: 'zip', 'postal code': 'zip', pincode: 'zip',
  rating: 'rating', score: 'rating', 'total score': 'rating', totalscore: 'rating',
  stars: 'rating', 'average rating': 'rating',
  reviews: 'reviewsCount', 'reviews count': 'reviewsCount', reviewscount: 'reviewsCount',
  'review count': 'reviewsCount', 'number of reviews': 'reviewsCount',
  tags: 'tags', tag: 'tags', labels: 'tags', categories: 'tags', keywords: 'tags',
  notes: 'notes', note: 'notes', comment: 'notes', comments: 'notes',
  description: 'notes', details: 'notes', remarks: 'notes',
};

// ── Duplicate detection ────────────────────────────────────
type MatchType = 'email' | 'phone' | 'name';
type DupAction = 'skip' | 'replace';

interface DuplicateMatch {
  importRow: ImportRow;
  importIndex: number;
  matchType: MatchType;
  existing: CRMLeadWithCard;
  action: DupAction; // embedded so no Record key issues
}

function detectDuplicates(
  rows: ImportRow[],
  leadsWithCards: CRMLeadWithCard[],
): DuplicateMatch[] {
  const dupes: DuplicateMatch[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.name?.trim()) continue;

    let match: DuplicateMatch | null = null;

    // 1. Email match — highest confidence
    if (!match && row.email?.trim()) {
      const email = row.email.toLowerCase().trim();
      const lead = leadsWithCards.find(
        l => l.contact?.email?.toLowerCase() === email,
      );
      if (lead) match = { importRow: row, importIndex: i, matchType: 'email', existing: lead, action: 'skip' };
    }

    // 2. Phone match — strip non-digits, compare last 10 digits
    if (!match && row.phone?.trim()) {
      const digits = row.phone.replace(/\D/g, '').slice(-10);
      if (digits.length >= 7) {
        const lead = leadsWithCards.find(l => {
          const p = l.contact?.phone?.replace(/\D/g, '').slice(-10) ?? '';
          return p.length >= 7 && p === digits;
        });
        if (lead) match = { importRow: row, importIndex: i, matchType: 'phone', existing: lead, action: 'skip' };
      }
    }

    // 3. Exact name match (case-insensitive)
    if (!match) {
      const name = row.name.trim().toLowerCase();
      const lead = leadsWithCards.find(l => l.card.title.toLowerCase() === name);
      if (lead) match = { importRow: row, importIndex: i, matchType: 'name', existing: lead, action: 'skip' };
    }

    if (match) dupes.push(match);
  }
  return dupes;
}

const MATCH_BADGE: Record<MatchType, { label: string; cls: string }> = {
  email: { label: 'Email match',  cls: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  phone: { label: 'Phone match',  cls: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' },
  name:  { label: 'Name match',   cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
};

// ── Step types ────────────────────────────────────────────
type Step = 'source' | 'preview' | 'mapping' | 'duplicates' | 'done';
const STEP_LABELS: Step[] = ['source', 'preview', 'mapping', 'done'];
const STEP_DISPLAY: Record<Step, string> = {
  source: 'Source', preview: 'Preview', mapping: 'Map Fields',
  duplicates: 'Duplicates', done: 'Done',
};

interface Props { open: boolean; onClose: () => void; }

export function ImportLeadsModal({ open, onClose }: Props) {
  const { bulkImportLeads, leadsWithCards, deleteLead } = useCRM();

  const [step, setStep]               = useState<Step>('source');
  const [sheetsUrl, setSheetsUrl]     = useState('');
  const [headers, setHeaders]         = useState<string[]>([]);
  const [dataRows, setDataRows]       = useState<string[][]>([]);
  const [mapping, setMapping]         = useState<Record<number, string>>({});
  const [autoMappedCols, setAutoMappedCols] = useState<Set<number>>(new Set());
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<{ created: number; skipped: number; deleted: number } | null>(null);

  // Duplicate state — action embedded directly in each item to avoid Record key issues
  const [duplicates, setDuplicates]   = useState<DuplicateMatch[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);

  const setDupAction = (importIndex: number, action: DupAction) =>
    setDuplicates(prev => prev.map(d => d.importIndex === importIndex ? { ...d, action } : d));

  const setAllActions = (action: DupAction) =>
    setDuplicates(prev => prev.map(d => ({ ...d, action })));

  const reset = () => {
    setStep('source'); setSheetsUrl('');
    setHeaders([]); setDataRows([]); setMapping({}); setAutoMappedCols(new Set());
    setResult(null); setDuplicates([]);
  };
  const close = () => { reset(); onClose(); };

  const guessMapping = (hdrs: string[]): { map: Record<number, string>; autoSet: Set<number> } => {
    const map: Record<number, string> = {};
    const autoSet = new Set<number>();
    hdrs.forEach((h, i) => {
      const key = h.toLowerCase().trim();
      if (ALIASES[key]) { map[i] = ALIASES[key]; autoSet.add(i); }
    });
    return { map, autoSet };
  };

  const loadData = (rows: string[][]) => {
    if (rows.length < 2) { toast.error('File appears empty or has no data rows'); return; }
    const hdrs = rows[0].map(h => String(h));
    const data = rows.slice(1);
    const { map, autoSet } = guessMapping(hdrs);
    setHeaders(hdrs);
    setDataRows(data);
    setMapping(map);
    setAutoMappedCols(autoSet);
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

  // Convert dataRows + mapping to ImportRow[]
  const buildRows = (): ImportRow[] =>
    dataRows.map(row => {
      const obj: ImportRow = {};
      Object.entries(mapping).forEach(([ci, field]) => {
        if (field) obj[field] = String(row[Number(ci)] ?? '').trim() || undefined;
      });
      return obj;
    });

  // Step: mapping → check for duplicates first
  const handleCheckDuplicates = () => {
    const rows = buildRows();
    const dupes = detectDuplicates(rows, leadsWithCards);
    if (dupes.length === 0) {
      // No duplicates — go straight to import
      runImport(rows);
    } else {
      setDuplicates(dupes); // each item starts with action: 'skip'
      setStep('duplicates');
    }
  };

  // Final import after duplicate review
  const confirmImport = async () => {
    setLoading(true);
    const rows = buildRows();

    // Read actions directly from duplicates array (no Record key issues)
    const toDelete = duplicates.filter(d => d.action === 'replace');
    const skipIndices = new Set(
      duplicates.filter(d => d.action === 'skip').map(d => d.importIndex),
    );

    let deleted = 0;
    try {
      // Delete existing leads marked for replacement
      for (const d of toDelete) {
        await deleteLead(d.existing.id);
        deleted++;
      }
    } catch (err: any) {
      toast.error('Failed to delete existing lead', { description: err.message });
      setLoading(false);
      return;
    }

    // Filter rows: skip those marked 'skip', import the rest
    const filteredRows = rows.filter((_, i) => !skipIndices.has(i));
    await runImport(filteredRows, deleted);
  };

  const runImport = async (rows: ImportRow[], deleted = 0) => {
    setLoading(true);
    try {
      const res = await bulkImportLeads(rows);
      setResult({ ...res, deleted });
      setStep('done');
      const msg = deleted > 0
        ? `Imported ${res.created} leads, replaced ${deleted}`
        : `Imported ${res.created} lead${res.created !== 1 ? 's' : ''}`;
      toast.success(msg);
    } catch (err: any) {
      toast.error('Import failed', { description: err.message });
    } finally { setLoading(false); }
  };

  const hasNameMapped = Object.values(mapping).includes('name');

  const dupSkipCount    = duplicates.filter(d => d.action === 'skip').length;
  const dupReplaceCount = duplicates.filter(d => d.action === 'replace').length;
  const importCount     = dataRows.length - dupSkipCount;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) close(); }}>
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
              {([...STEP_LABELS, ...(duplicates.length > 0 ? ['duplicates' as Step] : [])] as Step[])
                .filter(s => s !== 'done')
                .map((s, i, arr) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <span className={cn(
                      'text-xs font-medium',
                      step === s ? 'text-primary' : 'text-muted-foreground/50'
                    )}>
                      {s === 'duplicates' ? `Duplicates (${duplicates.length})` : STEP_DISPLAY[s]}
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
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Map columns to CRM fields. <span className="font-semibold text-foreground">Name</span> is required.
                </p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Auto-detected
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/30 inline-block" /> Not mapped
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_1fr_1fr] gap-0 bg-muted/50 border-b border-border">
                  <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Your Column</div>
                  <div className="px-2 py-2" />
                  <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Maps To</div>
                  <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Sample Value</div>
                </div>

                <div className="divide-y divide-border/30 max-h-64 overflow-y-auto">
                  {headers.map((h, i) => {
                    const isAutoMapped = autoMappedCols.has(i);
                    const currentVal = mapping[i] ?? '';
                    const isMapped = currentVal !== '';
                    return (
                      <div
                        key={i}
                        className={cn(
                          'grid grid-cols-[1fr_auto_1fr_1fr] gap-0 items-center hover:bg-muted/20 transition-colors',
                          isMapped && isAutoMapped ? 'bg-emerald-500/5' : ''
                        )}
                      >
                        <div className="px-3 py-2.5 flex items-center gap-2 min-w-0">
                          <span className={cn('w-2 h-2 rounded-full shrink-0',
                            isMapped ? isAutoMapped ? 'bg-emerald-500' : 'bg-primary' : 'bg-muted-foreground/25')} />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate" title={h}>{h}</p>
                            {isAutoMapped && isMapped && (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">auto-detected</p>
                            )}
                          </div>
                        </div>
                        <div className="px-2">
                          <ChevronRight className={cn('w-3.5 h-3.5', isMapped ? 'text-primary' : 'text-muted-foreground/30')} />
                        </div>
                        <div className="px-3 py-2">
                          <select
                            value={currentVal}
                            onChange={e => setMapping(prev => ({ ...prev, [i]: e.target.value }))}
                            className={cn(
                              'w-full text-xs bg-background border rounded-md px-2 py-1.5 outline-none transition-colors',
                              isMapped
                                ? isAutoMapped ? 'border-emerald-500/50 text-foreground' : 'border-primary/50 text-foreground'
                                : 'border-border text-muted-foreground'
                            )}
                          >
                            <option value="">— Skip —</option>
                            {(['Lead','Contact','Address','Extra'] as const).map(grp => {
                              const items = CRM_FIELDS.filter(f => f.group === grp);
                              return items.length ? (
                                <optgroup key={grp} label={grp}>
                                  {items.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                  ))}
                                </optgroup>
                              ) : null;
                            })}
                          </select>
                        </div>
                        <div className="px-3 py-2 min-w-0">
                          <span className="text-[11px] text-muted-foreground/70 truncate block" title={String(dataRows[0]?.[i] ?? '')}>
                            {String(dataRows[0]?.[i] ?? '') || <span className="italic">empty</span>}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {autoMappedCols.size} auto-detected
                </span>
                <span>{Object.values(mapping).filter(v => v).length} of {headers.length} columns mapped</span>
              </div>
            </div>
          )}

          {/* Step: Duplicates ──────────────────────────────── */}
          {step === 'duplicates' && (
            <div className="space-y-4">
              {/* Banner */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {duplicates.length} duplicate{duplicates.length !== 1 ? 's' : ''} detected
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    These import rows match leads already in your pipeline. Choose what to do with each one.
                  </p>
                </div>
              </div>

              {/* Action bar — select all */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setAllActions('skip')}
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  Skip all
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setAllActions('replace')}
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  Replace all
                </button>
              </div>

              {/* Duplicate table */}
              <div className="rounded-lg border border-border overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[2fr_1fr_2fr_auto] bg-muted/50 border-b border-border">
                  <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Importing</div>
                  <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Match</div>
                  <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Existing Lead</div>
                  <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Action</div>
                </div>

                <div className="divide-y divide-border/30 max-h-72 overflow-y-auto">
                  {duplicates.map((d) => {
                    const action = d.action;
                    return (
                      <div
                        key={d.importIndex}
                        className={cn(
                          'grid grid-cols-[2fr_1fr_2fr_auto] items-center hover:bg-muted/10 transition-colors',
                          action === 'replace' && 'bg-red-500/5',
                        )}
                      >
                        {/* Import row info */}
                        <div className="px-3 py-3 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{d.importRow.name}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">
                            {d.importRow.email || d.importRow.phone || d.importRow.company || '—'}
                          </p>
                        </div>

                        {/* Match type badge */}
                        <div className="px-3 py-3">
                          <span className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                            MATCH_BADGE[d.matchType].cls,
                          )}>
                            {MATCH_BADGE[d.matchType].label}
                          </span>
                        </div>

                        {/* Existing lead */}
                        <div className="px-3 py-3 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{d.existing.card.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-muted-foreground/70">
                              {d.existing.currentStage ?? 'Unknown stage'}
                            </span>
                            {d.existing.dealValue && (
                              <>
                                <span className="text-muted-foreground/30">·</span>
                                <span className="text-[10px] text-muted-foreground/70">
                                  {d.existing.currency ?? 'USD'} {Number(d.existing.dealValue).toLocaleString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action toggle */}
                        <div className="px-3 py-3 flex items-center gap-1">
                          <button
                            type="button"
                            title="Skip — keep existing, don't import this row"
                            onClick={() => setDupAction(d.importIndex, 'skip')}
                            className={cn(
                              'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                              action === 'skip'
                                ? 'bg-muted text-foreground ring-1 ring-border'
                                : 'text-muted-foreground/40 hover:bg-muted/50',
                            )}
                          >
                            <SkipForward className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Replace — delete existing lead and import new one"
                            onClick={() => setDupAction(d.importIndex, 'replace')}
                            className={cn(
                              'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                              action === 'replace'
                                ? 'bg-red-500/20 text-red-500 ring-1 ring-red-500/30'
                                : 'text-muted-foreground/40 hover:bg-muted/50',
                            )}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <SkipForward className="w-3 h-3" /> Skip — keep existing lead as-is
                </span>
                <span className="flex items-center gap-1.5 text-red-500">
                  <Trash2 className="w-3 h-3" /> Replace — deletes the existing lead
                </span>
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && result && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              {result.created > 0
                ? <CheckCircle2 className="w-14 h-14 text-emerald-500" />
                : <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                  </div>
              }
              <div className="space-y-1">
                <p className="text-xl font-bold">{result.created} lead{result.created !== 1 ? 's' : ''} imported</p>
                {result.deleted > 0 && (
                  <p className="text-sm text-red-500 font-medium">
                    {result.deleted} existing lead{result.deleted !== 1 ? 's' : ''} replaced
                  </p>
                )}
                {result.skipped > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {result.skipped} rows skipped (no name, or database error)
                  </p>
                )}
                {result.created === 0 && result.skipped > 0 && !result.deleted && (
                  <p className="text-xs text-muted-foreground/70 mt-2 max-w-xs">
                    Check the browser console (F12) for specific errors.
                    Common causes: CRM pipeline not initialized, or a database permission issue.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Fixed footer ─────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
          <div className="text-xs text-muted-foreground">
            {step === 'preview' && `${dataRows.length} rows ready`}
            {step === 'mapping' && !hasNameMapped && (
              <span className="text-destructive">Map the "Name" field to continue</span>
            )}
            {step === 'mapping' && hasNameMapped && `${dataRows.length} rows to check for duplicates`}
            {step === 'duplicates' && (
              <span>
                <span className="font-semibold text-foreground">{importCount}</span> will be imported
                {dupSkipCount > 0 && <>, <span className="text-muted-foreground/70">{dupSkipCount} skipped</span></>}
                {dupReplaceCount > 0 && <>, <span className="text-red-500 font-medium">{dupReplaceCount} replaced</span></>}
              </span>
            )}
          </div>

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
                  onClick={handleCheckDuplicates}
                  disabled={loading || !hasNameMapped}
                >
                  {loading
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Checking…</>
                    : `Check & Import ${dataRows.length} leads`}
                </Button>
              </>
            )}
            {step === 'duplicates' && (
              <>
                <Button variant="outline" size="sm" onClick={() => setStep('mapping')}>Back</Button>
                <Button
                  size="sm"
                  onClick={confirmImport}
                  disabled={loading}
                  variant={dupReplaceCount > 0 ? 'destructive' : 'default'}
                >
                  {loading
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Importing…</>
                    : dupReplaceCount > 0
                    ? <><Trash2 className="w-3.5 h-3.5 mr-1.5" />Replace {dupReplaceCount} & Import {importCount}</>
                    : `Import ${importCount} leads`}
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
