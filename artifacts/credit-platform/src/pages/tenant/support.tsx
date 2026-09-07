import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td, Field, inputCls } from '@/components/admin/page-kit';
import { Headset, Mail, Phone, Clock3 } from 'lucide-react';

const tickets = [
  { id: 'TKT-4412', subject: 'Score-batch endpoint returning 429 under limit', opened: 'Yesterday', status: 'in progress', priority: 'high' },
  { id: 'TKT-4398', subject: 'Request additional sandbox key for UAT', opened: '28 Aug', status: 'resolved', priority: 'low' },
  { id: 'TKT-4371', subject: 'Question on June quality scorecard', opened: '21 Aug', status: 'resolved', priority: 'medium' },
];

export default function ContactSupport() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Headset} tint="#10B981" title="Contact Support"
          subtitle="Enterprise support — 8h response SLA on your plan" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Panel title="New Ticket" padded className="lg:col-span-2">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Category">
                  <select className={inputCls}><option>API & integration</option><option>Data submission</option><option>Billing</option><option>Disputes</option><option>Other</option></select>
                </Field>
                <Field label="Priority">
                  <select className={inputCls}><option>Low</option><option>Medium</option><option>High — production impact</option></select>
                </Field>
              </div>
              <Field label="Subject"><input className={inputCls} placeholder="Brief summary" /></Field>
              <Field label="Description"><textarea rows={4} className={inputCls} placeholder="What happened, expected behaviour, request IDs if relevant…" /></Field>
              <button className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold">Submit Ticket</button>
            </div>
          </Panel>
          <Panel title="Reach Us" padded>
            <div className="space-y-4 text-sm">
              <p className="flex items-center gap-3 text-gray-700"><Mail className="w-4 h-4 text-gray-400" /> support@socialscore.co.zm</p>
              <p className="flex items-center gap-3 text-gray-700"><Phone className="w-4 h-4 text-gray-400" /> +260 211 555 010</p>
              <p className="flex items-center gap-3 text-gray-700"><Clock3 className="w-4 h-4 text-gray-400" /> Mon–Fri 08:00–18:00 CAT · critical incidents 24/7</p>
              <p className="text-xs text-muted-foreground pt-3 border-t border-slate-100">Your account manager: Grace Zulu · grace.zulu@socialscore.co.zm</p>
            </div>
          </Panel>
        </div>
        <Panel title="Your Recent Tickets">
          <Table head={['Ticket', 'Subject', 'Opened', 'Priority', 'Status']}>
            {tickets.map(t => (
              <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs text-blue-600">{t.id}</Td>
                <Td className="font-semibold text-gray-900">{t.subject}</Td>
                <Td className="text-muted-foreground">{t.opened}</Td>
                <Td><Badge tone={t.priority === 'high' ? 'red' : t.priority === 'medium' ? 'amber' : 'slate'}>{t.priority}</Badge></Td>
                <Td><Badge tone={t.status === 'resolved' ? 'green' : 'blue'}>{t.status}</Badge></Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
