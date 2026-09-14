
import { getAllProviders } from '@/lib/providers/registry';

export default function SourcesAdmin() {
  const providers = getAllProviders();
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">Admin Source Manager - /admin/sources</h1>
      <div className="mt-6 grid gap-2">
        {providers.map(p=>(
          <div key={p.key} className="flex justify-between p-3 rounded bg-zinc-900 border border-zinc-800">
            <div><span className="font-semibold">{p.name}</span> <span className="text-zinc-500 text-sm">({p.category}) - {p.purpose.join('+')}</span></div>
            <div className="text-sm">{p.isConfigured()?'ACTIVE':'NOT_CONFIGURED'} • Priority {p.key==='osm'?1:10}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
