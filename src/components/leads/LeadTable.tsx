
'use client';
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';

interface Lead {
  id: string;
  businessName: string;
  category?: string;
  industry?: string;
  country: string;
  city: string;
  area?: string;
  website?: string;
  email?: string;
  emailStatus: string;
  emailConfidence: number;
  whatsapp?: string;
  whatsappStatus: string;
  whatsappConfidence: number;
  phone?: string;
  leadScore: number;
  primarySource?: string;
  createdAt: string;
}

export function LeadTable() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [filters, setFilters] = useState({ country:'', city:'', category:'', hasEmail:'', hasWhatsapp:'', minScore:0, search:'' });
  const limit = 20;

  const fetchLeads = async () => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(filters.country && { country: filters.country }),
      ...(filters.city && { city: filters.city }),
      ...(filters.category && { category: filters.category }),
      ...(filters.hasEmail && { hasEmail: filters.hasEmail }),
      ...(filters.hasWhatsapp && { hasWhatsapp: filters.hasWhatsapp }),
      ...(filters.minScore ? { minScore: String(filters.minScore) } : {}),
    });
    // Use Express API when deployed, Next API during dev
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    const res = await fetch(`${base}/api/leads?${params}`);
    const data = await res.json();
    setLeads(data.leads || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  };

  useEffect(()=>{ fetchLeads(); }, [page, filters]);

  const toggleSelect = (id: string) => setSelected(s=> s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);
  const toggleAll = () => setSelected(selected.length===leads.length ? [] : leads.map(l=>l.id));

  const handleExport = async (format: 'csv'|'xlsx') => {
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    const res = await fetch(`${base}/api/exports`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ format, selectedIds: selected.length? selected : undefined, filters })
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${Date.now()}.${format}`;
    a.click();
  };

  const getScoreVariant = (score: number) => {
    if (score>=90) return 'success';
    if (score>=75) return 'success';
    if (score>=60) return 'warning';
    return 'secondary';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
        <Input placeholder="Country" value={filters.country} onChange={e=>setFilters({...filters, country:e.target.value})} className="w-[140px]" />
        <Input placeholder="City" value={filters.city} onChange={e=>setFilters({...filters, city:e.target.value})} className="w-[140px]" />
        <Input placeholder="Category" value={filters.category} onChange={e=>setFilters({...filters, category:e.target.value})} className="w-[140px]" />
        <Select value={filters.hasEmail} onChange={(e:any)=>setFilters({...filters, hasEmail:e.target.value})} className="w-[140px]">
          <option value="">Email: Any</option><option value="true">Has Email</option>
        </Select>
        <Select value={filters.hasWhatsapp} onChange={(e:any)=>setFilters({...filters, hasWhatsapp:e.target.value})} className="w-[160px]">
          <option value="">WhatsApp: Any</option><option value="true">Confirmed Public</option>
        </Select>
        <Select value={String(filters.minScore)} onChange={(e:any)=>setFilters({...filters, minScore: Number(e.target.value)})} className="w-[140px]">
          <option value="0">Score: Any</option><option value="60">Good 60+</option><option value="75">High 75+</option><option value="90">Excellent 90+</option>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={()=>handleExport('csv')}>Export CSV ({selected.length||total})</Button>
          <Button variant="outline" size="sm" onClick={()=>handleExport('xlsx')}>Export XLSX</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-zinc-400">
        <span>Total: <b className="text-white">{total}</b></span>
        <span>Selected: <b className="text-white">{selected.length}</b></span>
        <span>Page {page} of {totalPages}</span>
        <span className="ml-auto">Real DB only • No dummy data • Server pagination (max 100/page)</span>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Checkbox checked={selected.length===leads.length && leads.length>0} onChange={toggleAll} /></TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Business</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Website</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>WhatsApp</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length===0 ? (
            <TableRow><TableCell colSpan={11} className="text-center py-12 text-zinc-500">No leads yet. Start a campaign with target 1000+. Production shows zero when DB empty - no fake data.</TableCell></TableRow>
          ) : leads.map(lead=>(
            <TableRow key={lead.id}>
              <TableCell><Checkbox checked={selected.includes(lead.id)} onChange={()=>toggleSelect(lead.id)} /></TableCell>
              <TableCell><Badge variant={getScoreVariant(lead.leadScore)}>{lead.leadScore}</Badge></TableCell>
              <TableCell className="font-medium max-w-[180px] truncate">{lead.businessName}</TableCell>
              <TableCell className="text-zinc-400">{lead.category||'-'}</TableCell>
              <TableCell>{lead.city}, {lead.country}</TableCell>
              <TableCell>{lead.website ? <a href={lead.website} target="_blank" className="text-blue-400 hover:underline truncate max-w-[120px] inline-block">{new URL(lead.website).hostname}</a> : <span className="text-zinc-600">-</span>}</TableCell>
              <TableCell>
                {lead.email ? <div><div className="truncate max-w-[160px]">{lead.email}</div><Badge variant={lead.emailStatus==='VALID'?'success':'secondary'} className="mt-1">{lead.emailStatus} {Math.round((lead.emailConfidence||0)*100)}%</Badge></div> : <span className="text-zinc-600">-</span>}
              </TableCell>
              <TableCell>
                {lead.whatsapp ? <div><div>{lead.whatsapp}</div><Badge variant={lead.whatsappStatus==='CONFIRMED_PUBLIC_WHATSAPP'?'success':'secondary'} className="mt-1">{lead.whatsappStatus}</Badge></div> : <span className="text-zinc-600">-</span>}
              </TableCell>
              <TableCell className="text-zinc-400">{lead.phone||'-'}</TableCell>
              <TableCell><Badge variant="secondary">{lead.primarySource||'OSM'}</Badge></TableCell>
              <TableCell className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={()=>navigator.clipboard.writeText(lead.email||'')}>Copy Email</Button>
                <Button size="sm" variant="ghost" onClick={()=>lead.website && window.open(lead.website,'_blank')}>Open</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <Button variant="outline" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</Button>
        <span className="text-sm text-zinc-400">Page {page} / {totalPages} • {total} total leads • Server-side pagination - never load 10k at once</span>
        <Button variant="outline" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next</Button>
      </div>
    </div>
  )
}
