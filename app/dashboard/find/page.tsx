
'use client';
import { useState } from 'react';

export default function FindLeads() {
  const [form, setForm] = useState({ country: 'United Arab Emirates', city: 'Dubai', area: '', businessNature: 'Restaurants', industry: '', keywords: 'restaurant, cafe, catering, food', target: 1000 });
  const [progress, setProgress] = useState<any>(null);

  const start = async () => {
    const res = await fetch('/api/campaigns', { method: 'POST', body: JSON.stringify({ ...form, keywords: form.keywords.split(',').map(s=>s.trim()), target: form.target }), headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    setProgress(data);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold">Find Leads - Target 1000+</h1>
      <div className="mt-8 grid grid-cols-3 gap-8">
        <div className="space-y-4">
          <label className="block">Country<input value={form.country} onChange={e=>setForm({...form,country:e.target.value})} className="w-full mt-1 p-2 rounded bg-zinc-900 border border-zinc-700"/></label>
          <label className="block">City<input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} className="w-full mt-1 p-2 rounded bg-zinc-900 border border-zinc-700"/></label>
          <label className="block">Area<input value={form.area} onChange={e=>setForm({...form,area:e.target.value})} className="w-full mt-1 p-2 rounded bg-zinc-900 border border-zinc-700"/></label>
        </div>
        <div className="space-y-4">
          <label className="block">Business Nature<input value={form.businessNature} onChange={e=>setForm({...form,businessNature:e.target.value})} className="w-full mt-1 p-2 rounded bg-zinc-900 border border-zinc-700"/></label>
          <label className="block">Keywords<input value={form.keywords} onChange={e=>setForm({...form,keywords:e.target.value})} className="w-full mt-1 p-2 rounded bg-zinc-900 border border-zinc-700"/></label>
          <label className="block">Target<select value={form.target} onChange={e=>setForm({...form,target:Number(e.target.value)})} className="w-full mt-1 p-2 rounded bg-zinc-900 border border-zinc-700">
            <option value={100}>100</option><option value={250}>250</option><option value={500}>500</option><option value={1000}>1000</option><option value={2500}>2500</option><option value={5000}>5000</option><option value={10000}>10000</option>
          </select></label>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <h3 className="font-semibold">Live Extraction</h3>
          {progress ? <div className="mt-4 text-sm space-y-2"><div>Target: {progress.target}</div><div>Status: {progress.status}</div><div>Campaign: {progress.campaignId}</div></div> : <div className="mt-4 text-zinc-500 text-sm">Start a campaign to see real-time progress from DB</div>}
          <button onClick={start} className="mt-6 w-full py-3 bg-white text-black rounded-full font-semibold">Start 1000+ Campaign</button>
          <p className="mt-3 text-xs text-zinc-500">Enforces IMPORTANT OPERATING RULES server-side: min 1000, no duplicates, no fake data, SSRF protected.</p>
        </div>
      </div>
    </div>
  )
}
