
'use client';
import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PUBLIC_APIS } from '@/lib/providers/publicApis';

export default function DataSourcesPage() {
  const [grouped, setGrouped] = useState<any>({});
  const [stats, setStats] = useState({ total:0, free:0 });

  useEffect(()=>{
    fetch('/api/data-sources').then(r=>r.json()).then(d=>{
      setGrouped(d.byCategory||{});
      setStats({ total: d.total, free: d.freeCount });
    });
  },[]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Sources API - 81 Public APIs + OSM Primary</h1>
        <p className="text-zinc-400 mt-2">From your CSV: Business (10), Email (10), Phone (5), Geocoding (11), Open Data (13), Jobs (10), Shopping (10), Social (7), Discovery (5). Free-first waterfall: OSM → OpenCorporates → Marketplaces → Website → Validation</p>
        <div className="flex gap-4 mt-4">
          <Badge variant="success">Total: {stats.total}</Badge>
          <Badge variant="success">Free (no auth): {stats.free}</Badge>
          <Badge>Free-first OSM primary</Badge>
        </div>
      </div>

      {Object.entries(grouped).map(([cat, apis]: any)=>(
        <div key={cat}>
          <h2 className="text-xl font-semibold mb-3">{cat} ({apis.length})</h2>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Auth</TableHead><TableHead>HTTPS</TableHead><TableHead>CORS</TableHead><TableHead>Purpose</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {apis.map((api:any)=>(
                <TableRow key={api.key}>
                  <TableCell><div className="font-medium">{api.name}</div><div className="text-xs text-zinc-500">{api.url}</div></TableCell>
                  <TableCell className="text-sm text-zinc-400 max-w-[400px] truncate">{api.description}</TableCell>
                  <TableCell><Badge variant={api.auth==='No'?'success':'secondary'}>{api.auth}</Badge></TableCell>
                  <TableCell>{api.https}</TableCell>
                  <TableCell>{api.cors}</TableCell>
                  <TableCell className="text-xs">{api.purpose?.join('+')}</TableCell>
                  <TableCell><Badge variant={api.free?'success':'secondary'}>{api.free?'ACTIVE':'NOT_CONFIGURED'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  )
}
