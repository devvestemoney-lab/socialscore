import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { Code2, ExternalLink } from 'lucide-react';

const endpoints = [
  { method: 'POST', path: '/v1/credit/report', desc: 'Pull a full credit report (requires consent + purpose)' },
  { method: 'GET', path: '/v1/credit/score', desc: 'Retrieve the current score and band for a consumer' },
  { method: 'POST', path: '/v1/credit/score-batch', desc: 'Score up to 500 consumers in one call' },
  { method: 'POST', path: '/v1/identity/verify', desc: 'Verify NRC details against the national registry' },
  { method: 'POST', path: '/v1/consent/grant', desc: 'Record a consumer consent captured in your channel' },
  { method: 'POST', path: '/v1/data/submit', desc: 'Submit a monthly batch file programmatically' },
  { method: 'POST', path: '/v1/disputes', desc: 'File or respond to a dispute on behalf of a consumer' },
];

export default function ApiDocs() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Code2} tint="#6366F1" title="API Documentation"
          subtitle="REST API v1 — authenticate with your bearer key on every request"
          actions={<button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"><ExternalLink className="w-4 h-4" /> Open Full Reference</button>} />
        <Panel padded>
          <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs overflow-x-auto leading-relaxed">{`curl -X POST https://api.socialscore.co.zm/v1/credit/report \\
  -H "Authorization: Bearer sscore_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "nrc": "482913/61/1", "purpose": "loan_origination", "reference": "APP-2026-1121" }'`}</pre>
        </Panel>
        <Panel title="Endpoints">
          <Table head={['Method', 'Endpoint', 'Description']}>
            {endpoints.map(e => (
              <tr key={e.path} className="hover:bg-slate-50/70 transition-colors">
                <Td><Badge tone={e.method === 'GET' ? 'blue' : 'violet'}>{e.method}</Badge></Td>
                <Td className="font-mono text-xs text-gray-900">{e.path}</Td>
                <Td className="text-muted-foreground">{e.desc}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
