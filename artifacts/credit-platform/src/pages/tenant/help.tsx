import { Layout } from '@/components/layout';
import { PageHeader, Panel } from '@/components/admin/page-kit';
import { LifeBuoy, Search, FileText, Scale, UploadCloud, KeyRound, Gauge, Users } from 'lucide-react';

const topics = [
  { icon: FileText, tint: '#10B981', t: 'Pulling credit reports', d: 'Purposes, consent requirements and reading the report' },
  { icon: UploadCloud, tint: '#4F6EF7', t: 'Monthly data submission', d: 'File formats, deadlines and fixing validation errors' },
  { icon: Scale, tint: '#F59E0B', t: 'Responding to disputes', d: 'Evidence requirements and statutory timelines' },
  { icon: KeyRound, tint: '#6366F1', t: 'API keys & security', d: 'Rotation, rate limits and IP allowlisting' },
  { icon: Gauge, tint: '#14B8A6', t: 'Understanding scores', d: 'Bands, probability of default and score factors' },
  { icon: Users, tint: '#8B5CF6', t: 'Managing your team', d: 'Inviting users, roles and branch scoping' },
];

export default function HelpCenter() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={LifeBuoy} tint="#4F6EF7" title="Help Center"
          subtitle="Guides for getting the most from the Social Score platform" />
        <Panel padded>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 max-w-lg">
            <Search className="w-4 h-4 text-gray-400" />
            <input placeholder="Search help articles…" className="bg-transparent outline-none text-sm flex-1" />
          </div>
        </Panel>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {topics.map(t => (
            <button key={t.t} className="p-5 rounded-xl bg-white border border-slate-200 text-left hover:border-blue-300 hover:shadow-sm transition">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${t.tint}1A` }}>
                <t.icon className="w-5 h-5" style={{ color: t.tint }} />
              </div>
              <p className="font-semibold text-gray-900">{t.t}</p>
              <p className="text-[13px] text-muted-foreground mt-1">{t.d}</p>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}
