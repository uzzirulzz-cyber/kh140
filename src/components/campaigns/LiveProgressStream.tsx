
'use client';
import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';

interface Progress {
  target: number;
  discovered: number;
  unique: number;
  emails: number;
  whatsapp: number;
  phones: number;
  websites: number;
  duplicates: number;
  invalid: number;
  highQuality: number;
  currentSource: string;
  progress: number;
  status: string;
  sourcesUsed: string[];
}

export function LiveProgressStream({ campaignId, onComplete }: { campaignId: string; onComplete?: (p: Progress)=>void }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(()=>{
    if (!campaignId) return;
    setIsLive(true);
    const es = new EventSource(`/api/campaigns/${campaignId}/stream`);
    esRef.current = es;

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type==='init') {
        setProgress(data.state);
        setLogs([`[INIT] Target ${data.state.target} - MIN 1000 enforced`]);
      }
      if (data.type==='progress') {
        setProgress(data);
        setLogs(prev=> [...prev.slice(-20), `[${data.currentSource.toUpperCase()}] Discovered ${data.discovered} | Unique ${data.unique} | Emails ${data.emails} | WA ${data.whatsapp} | Dup ${data.duplicates} | ${data.progress}%`]);
      }
      if (data.type==='complete') {
        setProgress(data.state);
        setIsLive(false);
        setLogs(prev=> [...prev, `[COMPLETE] ${data.state.unique}/${data.state.target} unique - Emails ${data.state.emails} (${Math.round(data.state.emails/data.state.unique*100)}%) WhatsApp ${data.state.whatsapp} (${Math.round(data.state.whatsapp/data.state.unique*100)}%)`]);
        onComplete?.(data.state);
        es.close();
      }
    };
    es.onerror = () => {
      setIsLive(false);
      es.close();
    };
    return () => { es.close(); setIsLive(false); };
  }, [campaignId]);

  if (!progress) return <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500">Waiting for campaign {campaignId}... Start campaign from Find Leads page</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
        <div className="col-span-8 flex justify-between items-center">
          <div className="flex gap-3 items-center">
            <h3 className="font-semibold">OSM Waterfall Live</h3>
            <Badge variant={isLive?'success':'secondary'}>{isLive ? '● LIVE' : progress.status}</Badge>
            <span className="text-xs text-zinc-500">ID: {campaignId}</span>
          </div>
          <div className="text-sm">Target: <b>{progress.target}</b> | Progress: <b>{progress.progress}%</b></div>
        </div>

        <div className="p-3 rounded-xl bg-black border border-zinc-800">
          <div className="text-xs text-zinc-500">Discovered</div>
          <div className="text-2xl font-bold">{progress.discovered}</div>
          <div className="text-[10px] text-zinc-500">Raw from sources</div>
        </div>
        <div className="p-3 rounded-xl bg-black border border-zinc-800 ring-1 ring-white/20">
          <div className="text-xs text-zinc-500">Unique Businesses</div>
          <div className="text-2xl font-bold text-white">{progress.unique}</div>
          <div className="text-xs text-emerald-400">{progress.progress}% of {progress.target}</div>
        </div>
        <div className="p-3 rounded-xl bg-black border border-zinc-800">
          <div className="text-xs text-zinc-500">Emails</div>
          <div className="text-2xl font-bold text-blue-400">{progress.emails}</div>
          <div className="text-xs">{progress.unique? Math.round(progress.emails/progress.unique*100):0}% coverage</div>
        </div>
        <div className="p-3 rounded-xl bg-black border border-zinc-800">
          <div className="text-xs text-zinc-500">Public WhatsApp</div>
          <div className="text-2xl font-bold text-green-400">{progress.whatsapp}</div>
          <div className="text-[10px]">CONFIRMED only - wa.me evidence</div>
        </div>
        <div className="p-3 rounded-xl bg-black border border-zinc-800">
          <div className="text-xs text-zinc-500">Phones</div>
          <div className="text-2xl font-bold">{progress.phones}</div>
          <div className="text-xs">88% typical</div>
        </div>
        <div className="p-3 rounded-xl bg-black border border-zinc-800">
          <div className="text-xs text-zinc-500">Websites</div>
          <div className="text-2xl font-bold">{progress.websites}</div>
          <div className="text-xs">92% typical</div>
        </div>
        <div className="p-3 rounded-xl bg-black border border-amber-500/30">
          <div className="text-xs text-zinc-500">Duplicates Removed</div>
          <div className="text-2xl font-bold text-amber-400">{progress.duplicates}</div>
          <div className="text-[10px]">Aggressive dedup</div>
        </div>
        <div className="p-3 rounded-xl bg-black border border-zinc-800">
          <div className="text-xs text-zinc-500">High Quality</div>
          <div className="text-2xl font-bold text-emerald-400">{progress.highQuality}</div>
          <div className="text-xs">Score 75+</div>
        </div>

        <div className="col-span-8">
          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-white to-zinc-300 transition-all duration-1000" style={{width:`${progress.progress}%`}} />
          </div>
          <div className="flex justify-between text-xs text-zinc-500 mt-2">
            <span>Current: <b className="text-white">{progress.currentSource}</b> | Sources: {progress.sourcesUsed?.join(' → ')}</span>
            <span>Waterfall: OSM → OpenCorporates → Foodpanda/Talabat/Amazon/noon/Zameen → Website → Email/Phone Validation</span>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-black border border-zinc-800 font-mono text-xs h-40 overflow-auto">
        {logs.map((l,i)=><div key={i} className="text-zinc-400">{l}</div>)}
      </div>
    </div>
  )
}
