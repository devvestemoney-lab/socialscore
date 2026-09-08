import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar, Modal, Field, inputCls } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import {
  Brain, ArrowLeft, GitBranch, Rocket, Archive, Users2, Gauge, AlertTriangle,
  Loader2, Save, FlaskConical, CheckCircle2, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const statusTone: Record<string, string> = { production: 'green', monitoring: 'amber', draft: 'blue', retired: 'slate' };
const SEGMENT: Record<string, string> = { consumer: 'Consumer', sme: 'SME', micro: 'Mobile Money Micro', thin_file: 'Thin File' };
const FACTOR_COLORS: Record<string, string> = {
  repaymentHistory: '#4F6EF7', transactionPatterns: '#8B5CF6', loanDefaults: '#F59E0B',
  mobileMoney: '#10B981', accountAge: '#14B8A6',
};
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const num = (v: string | null, dp = 3) => (v == null ? '—' : Number(v).toFixed(dp));

/* ═══════════════ Scorecard detail ═══════════════ */

function ScorecardDetail({ id, onBack, onChanged }: { id: string; onBack: () => void; onChanged: () => void }) {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState('weights');
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [thresholds, setThresholds] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showVersion, setShowVersion] = useState(false);
  const [newVersion, setNewVersion] = useState('');

  async function load() {
    const res = await request(`${API}/admin/scorecards/${id}`);
    const body = await res.json();
    setData(body);
    setWeights({ ...body.scorecard.weights });
    setThresholds({ ...body.scorecard.thresholds });
  }
  useEffect(() => { load(); }, [id]);

  async function save(payload: any, label: string) {
    setSaving(true); setError(''); setMessage('');
    const res = await request(`${API}/admin/scorecards/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).message ?? 'Save failed'); return; }
    setMessage(`${label} saved.`); load(); onChanged();
    setTimeout(() => setMessage(''), 2500);
  }

  async function act(path: string, body?: any) {
    setError('');
    const res = await request(`${API}/admin/scorecards/${id}/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) { setError((await res.json()).message ?? 'Action failed'); return null; }
    load(); onChanged();
    return res.json();
  }

  if (!data) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  const { scorecard: c, versions, bands, factors, abTest } = data;
  const total = Object.values(weights).reduce((a, b) => a + Number(b), 0);
  const balanced = Math.abs(total - 100) < 0.01;
  const maxBand = Math.max(1, ...bands.map((b: any) => b.n));
  const TABS = [['weights', 'Weight Config'], ['thresholds', 'Decision Thresholds'], ['performance', 'Performance'], ['versions', `Versions (${versions.length})`]] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button onClick={onBack} className="mt-1 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-gray-600"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-display font-bold text-gray-900">{c.name}</h1>
              <Badge tone="slate">{c.version}</Badge>
              <Badge tone={statusTone[c.status]}>{c.status}</Badge>
              <Badge tone="violet">{SEGMENT[c.segment] ?? c.segment}</Badge>
              {c.psi != null && Number(c.psi) > 0.1 && <Badge tone="red">PSI drift</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{c.notes}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Owner {c.owner || '—'} · {c.deployedAt ? `deployed ${fmtDate(c.deployedAt)}` : 'not deployed'}
              {c.retiredAt && ` · retired ${fmtDate(c.retiredAt)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowVersion(true); setNewVersion(''); setError(''); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-gray-700 hover:bg-slate-50">
            <GitBranch className="w-4 h-4" /> New version
          </button>
          {c.status !== 'production' && c.status !== 'retired' && (
            <button onClick={() => act('promote')} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium">
              <Rocket className="w-4 h-4" /> Promote to production
            </button>
          )}
          {c.status === 'production' && (
            <button onClick={() => confirm('Retire this scorecard? It will stop scoring new applications.') && act('retire')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm font-medium">
              <Archive className="w-4 h-4" /> Retire
            </button>
          )}
        </div>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}
      {message && <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {message}</div>}

      <KpiGrid items={[
        { label: 'Gini', value: num(c.gini), icon: Gauge, tint: '#4F6EF7', sub: 'discrimination' },
        { label: 'KS Statistic', value: num(c.ks), icon: Gauge, tint: '#8B5CF6' },
        { label: 'PSI', value: num(c.psi), icon: AlertTriangle, tint: c.psi != null && Number(c.psi) > 0.1 ? '#EF4444' : '#10B981', sub: 'tolerance 0.10' },
        { label: 'Auto-approve at', value: c.thresholds.autoApprove, icon: CheckCircle2, tint: '#10B981' },
        { label: 'Versions', value: versions.length, icon: GitBranch, tint: '#14B8A6' },
      ]} />

      <div className="flex gap-2 flex-wrap">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
              tab === key ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'weights' && (
        <Panel title="Factor Weights" subtitle="Each factor's contribution to the 1000-point score" padded>
          <div className={cn('flex items-center justify-between px-4 py-3 rounded-xl border mb-5',
            balanced ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200')}>
            <span className="text-sm font-medium text-gray-900">Total weight</span>
            <span className={cn('text-lg font-display font-bold', balanced ? 'text-emerald-600' : 'text-rose-600')}>
              {total}%{!balanced && <span className="text-xs font-normal ml-2">must equal 100%</span>}
            </span>
          </div>
          <div className="space-y-5">
            {factors.map((f: any) => {
              const value = Number(weights[f.key] ?? 0);
              return (
                <div key={f.key}>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{f.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">max {Math.round((value / 100) * 1000)} pts</span>
                      <input type="number" min={0} max={100} value={value}
                        onChange={e => setWeights(w => ({ ...w, [f.key]: Number(e.target.value) }))}
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-right outline-none focus:border-blue-500" />
                      <span className="text-sm font-bold text-gray-500">%</span>
                    </div>
                  </div>
                  <input type="range" min={0} max={60} value={value}
                    onChange={e => setWeights(w => ({ ...w, [f.key]: Number(e.target.value) }))}
                    className="w-full accent-blue-600" style={{ accentColor: FACTOR_COLORS[f.key] }} />
                  <Bar value={value * 1.6} color={FACTOR_COLORS[f.key] ?? '#4F6EF7'} />
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs text-muted-foreground flex-1">Saving recalibrates the scoring engine for all new applications on this card.</p>
            <button onClick={() => setWeights({ ...c.weights })} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">Reset</button>
            <button onClick={() => save({ weights }, 'Weights')} disabled={!balanced || saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save weights
            </button>
          </div>
        </Panel>
      )}

      {tab === 'thresholds' && (
        <Panel title="Decision Thresholds" subtitle="Score cut-offs that drive automated lending decisions" padded>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              ['autoApprove', 'Auto-approve at or above', 'Applications scoring here are approved without review'],
              ['manualReview', 'Manual review at or above', 'Referred to a credit officer'],
              ['autoDecline', 'Auto-decline below', 'Declined automatically as outside appetite'],
              ['maxLoanToIncome', 'Max loan-to-income ratio', 'Affordability ceiling applied after scoring'],
            ].map(([key, label, hint]) => (
              <Field key={key} label={label} hint={hint}>
                <input type="number" step={key === 'maxLoanToIncome' ? 0.05 : 10} className={inputCls}
                  value={thresholds[key] ?? 0}
                  onChange={e => setThresholds((t: any) => ({ ...t, [key]: Number(e.target.value) }))} />
              </Field>
            ))}
          </div>
          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Decision bands</p>
            <div className="flex h-8 rounded-lg overflow-hidden text-[11px] font-semibold text-white">
              <div className="flex items-center justify-center bg-rose-500" style={{ width: `${(thresholds.autoDecline / 1000) * 100}%` }}>Decline</div>
              <div className="flex items-center justify-center bg-amber-500" style={{ width: `${((thresholds.manualReview - thresholds.autoDecline) / 1000) * 100}%` }}>Review</div>
              <div className="flex items-center justify-center bg-blue-500" style={{ width: `${((thresholds.autoApprove - thresholds.manualReview) / 1000) * 100}%` }}>Refer up</div>
              <div className="flex items-center justify-center bg-emerald-500 flex-1">Approve</div>
            </div>
            <div className="flex justify-between mt-1.5 text-[11px] text-gray-400">
              <span>0</span><span>{thresholds.autoDecline}</span><span>{thresholds.manualReview}</span><span>{thresholds.autoApprove}</span><span>1000</span>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs text-muted-foreground flex-1">Thresholds must ascend: auto-decline &lt; manual review &lt; auto-approve.</p>
            <button onClick={() => save({ thresholds }, 'Thresholds')} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save thresholds
            </button>
          </div>
        </Panel>
      )}

      {tab === 'performance' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Model Performance" subtitle="Discrimination and stability against the validation sample" padded>
            <div className="space-y-4">
              {[
                ['Gini coefficient', Number(c.gini ?? 0), 1, '#4F6EF7', 'Rank-orders good from bad; higher is better'],
                ['KS statistic', Number(c.ks ?? 0), 1, '#8B5CF6', 'Maximum separation between good and bad distributions'],
                ['PSI (drift)', Number(c.psi ?? 0), 0.25, Number(c.psi ?? 0) > 0.1 ? '#EF4444' : '#10B981', 'Population stability — above 0.10 warrants review'],
              ].map(([label, value, scale, color, hint]: any) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="font-medium text-gray-900">{label}</span>
                    <span className="font-bold text-gray-900">{value.toFixed(3)}</span>
                  </div>
                  <Bar value={(value / scale) * 100} color={color} />
                  <p className="text-[11px] text-gray-400 mt-1">{hint}</p>
                </div>
              ))}
            </div>
            {c.psi != null && Number(c.psi) > 0.1 && (
              <p className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                PSI of {num(c.psi)} exceeds the 0.10 tolerance — the scored population has shifted from the development sample. Recalibration is recommended.
              </p>
            )}
          </Panel>

          <Panel title="Score Distribution" subtitle="Current scored population by band" padded>
            <div className="space-y-3.5">
              {bands.map((b: any) => (
                <div key={b.band}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="font-medium text-gray-900">Band {b.band}</span>
                    <span className="text-muted-foreground">{b.n.toLocaleString()}</span>
                  </div>
                  <Bar value={(b.n / maxBand) * 100}
                    color={b.band === 'A' ? '#10B981' : b.band === 'B' ? '#4F6EF7' : b.band === 'C' ? '#F59E0B' : '#EF4444'} />
                </div>
              ))}
            </div>
            {abTest?.enabled && (
              <div className="mt-5 pt-4 border-t border-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 inline-flex items-center gap-1.5">
                  <FlaskConical className="w-3.5 h-3.5" /> Active A/B test
                </p>
                <p className="text-sm text-gray-700">
                  {Number(abTest.challengerTrafficPct)}% of {SEGMENT[c.segment]} traffic is routed to the challenger,
                  running since {fmtDate(abTest.startedAt)}.
                </p>
              </div>
            )}
          </Panel>
        </div>
      )}

      {tab === 'versions' && (
        <Panel title="Version History" subtitle={`All versions of ${c.name}`}>
          <Table head={['Version', 'Status', 'Gini', 'KS', 'PSI', 'Deployed', 'Retired', 'Notes']}>
            {versions.map((v: any) => (
              <tr key={v.id} className={cn('transition-colors', v.id === c.id ? 'bg-blue-50/50' : 'hover:bg-slate-50/70')}>
                <Td className="font-semibold text-gray-900">{v.version}{v.id === c.id && <span className="ml-2 text-[10px] font-bold text-blue-500">VIEWING</span>}</Td>
                <Td><Badge tone={statusTone[v.status]}>{v.status}</Badge></Td>
                <Td>{num(v.gini)}</Td>
                <Td>{num(v.ks)}</Td>
                <Td className={v.psi != null && Number(v.psi) > 0.1 ? 'text-amber-600 font-semibold' : ''}>{num(v.psi)}</Td>
                <Td className="text-muted-foreground">{fmtDate(v.deployedAt)}</Td>
                <Td className="text-muted-foreground">{fmtDate(v.retiredAt)}</Td>
                <Td className="text-muted-foreground max-w-[280px] whitespace-normal text-xs">{v.notes}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      )}

      <Modal open={showVersion} onClose={() => setShowVersion(false)} title="New Version"
        subtitle={`Clones ${c.version} into a new draft you can tune independently`}>
        <div className="space-y-4">
          {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}
          <Field label="Version number" hint="e.g. v4.3">
            <input className={inputCls + ' font-mono'} value={newVersion} placeholder="v4.3" onChange={e => setNewVersion(e.target.value)} />
          </Field>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowVersion(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">Cancel</button>
            <button onClick={async () => { const r = await act('version', { version: newVersion }); if (r) setShowVersion(false); }}
              disabled={!newVersion.trim()}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40">
              Create draft
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════ Registry ═══════════════ */

export default function ScoringModels() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    const res = await request(`${API}/admin/scorecards`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  if (openId) return <Layout><ScorecardDetail id={openId} onBack={() => setOpenId(null)} onChanged={load} /></Layout>;
  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { scorecards, summary, abTests } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Brain} tint="#8B5CF6" title="Scorecards"
          subtitle="Scoring model registry — weights, decision thresholds, performance and champion/challenger tests" />

        <KpiGrid items={[
          { label: 'Scorecards', value: summary.total, icon: Brain, tint: '#8B5CF6', sub: `${summary.production} in production` },
          { label: 'Under Monitoring', value: summary.monitoring, icon: AlertTriangle, tint: summary.monitoring ? '#F59E0B' : '#94A3B8' },
          { label: 'PSI Drift', value: summary.drift, icon: AlertTriangle, tint: summary.drift ? '#EF4444' : '#10B981', sub: 'above 0.10 tolerance' },
          { label: 'Avg Gini (production)', value: summary.avgGini.toFixed(3), icon: Gauge, tint: '#4F6EF7' },
          { label: 'Scored Population', value: summary.scoredPopulation.toLocaleString(), icon: Users2, tint: '#14B8A6', sub: `avg score ${summary.avgScore}` },
        ]} />

        <Panel title="Model Registry" subtitle="Click a scorecard to configure weights, thresholds and versions">
          <Table head={['Model', 'Version', 'Segment', 'Status', 'Gini', 'KS', 'PSI', 'Deployed', 'Owner', '']}>
            {scorecards.map((c: any) => (
              <tr key={c.id} onClick={() => setOpenId(c.id)} className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                <Td className="font-semibold text-gray-900">{c.name}</Td>
                <Td className="font-mono text-xs">{c.version}</Td>
                <Td><Badge tone="violet">{SEGMENT[c.segment] ?? c.segment}</Badge></Td>
                <Td><Badge tone={statusTone[c.status]}>{c.status}</Badge></Td>
                <Td>{num(c.gini)}</Td>
                <Td>{num(c.ks)}</Td>
                <Td className={c.psi != null && Number(c.psi) > 0.1 ? 'text-rose-600 font-semibold' : ''}>{num(c.psi)}</Td>
                <Td className="text-muted-foreground">{fmtDate(c.deployedAt)}</Td>
                <Td className="text-muted-foreground">{c.owner || '—'}</Td>
                <Td><span className="text-xs font-semibold text-blue-600">Configure →</span></Td>
              </tr>
            ))}
          </Table>
        </Panel>

        {abTests.length > 0 && (
          <Panel title="Champion / Challenger Tests" subtitle="Live traffic splits by segment">
            <Table head={['Segment', 'Challenger Traffic', '', 'Status', 'Running Since']}>
              {abTests.map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-semibold text-gray-900">{SEGMENT[t.segment] ?? t.segment}</Td>
                  <Td>{Number(t.challengerTrafficPct)}%</Td>
                  <Td className="w-40"><Bar value={Number(t.challengerTrafficPct) * 2} color="#8B5CF6" /></Td>
                  <Td><Badge tone={t.enabled ? 'green' : 'slate'}>{t.enabled ? 'running' : 'stopped'}</Badge></Td>
                  <Td className="text-muted-foreground">{fmtDate(t.startedAt)}</Td>
                </tr>
              ))}
            </Table>
          </Panel>
        )}
      </div>
    </Layout>
  );
}
