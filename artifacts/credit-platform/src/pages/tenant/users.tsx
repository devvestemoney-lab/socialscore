import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Users, Plus, Pencil, Trash2, ShieldCheck, Eye, Crown, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const roleConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; description: string }> = {
  tenant_admin: { label: 'Admin', icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-500/10', description: 'Full access: users, rules, decisions' },
  tenant_user: { label: 'User', icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10', description: 'View credit profiles, make queries' },
};

const statusConfig = {
  active: { color: 'text-green-400', bg: 'bg-green-500/10', dot: 'bg-green-400' },
  inactive: { color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400' },
  suspended: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', dot: 'bg-yellow-400' },
};

interface User { id: string; name: string; email: string; role: string; status: string; createdAt: string; }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0f172a] border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-6 m-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-gray-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export default function TenantUsers() {
  const { request, user: me } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'tenant_user', password: '' });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const res = await request(`${API}/tenant/users`);
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addUser() {
    if (!form.name || !form.email || !form.password) {
      toast({ title: 'Missing fields', description: 'Name, email, and password are required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await request(`${API}/tenant/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'User created', description: `${form.name} has been added to your institution` });
        setShowAdd(false);
        setForm({ name: '', email: '', role: 'tenant_user', password: '' });
        load();
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } finally { setSubmitting(false); }
  }

  async function updateUser() {
    if (!editUser) return;
    setSubmitting(true);
    try {
      const res = await request(`${API}/tenant/users/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editUser.name, role: editUser.role, status: editUser.status }),
      });
      if (res.ok) {
        toast({ title: 'User updated' });
        setEditUser(null);
        load();
      }
    } finally { setSubmitting(false); }
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Remove ${name} from your institution?`)) return;
    const res = await request(`${API}/tenant/users/${id}`, { method: 'DELETE' });
    if (res.ok) { toast({ title: 'User removed' }); load(); }
  }

  const isAdmin = me?.role === 'tenant_admin';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-muted-foreground">Manage loan officers, risk managers, and admins for your institution</p>
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors text-sm">
              <Plus className="w-4 h-4" />
              Add User
            </button>
          )}
        </div>

        {/* Role guide */}
        <div className="grid md:grid-cols-2 gap-3">
          {Object.entries(roleConfig).map(([role, cfg]) => (
            <div key={role} className={cn('p-4 rounded-xl border border-slate-200', cfg.bg)}>
              <div className="flex items-center gap-2 mb-1">
                <cfg.icon className={cn('w-4 h-4', cfg.color)} />
                <span className={cn('text-sm font-semibold', cfg.color)}>{cfg.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{cfg.description}</p>
            </div>
          ))}
        </div>

        {/* Users list */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Team Members ({users.length})</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map(u => {
                const role = roleConfig[u.role];
                const RoleIcon = role?.icon || Eye;
                const status = statusConfig[u.status as keyof typeof statusConfig] || statusConfig.active;
                return (
                  <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-slate-200 flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-900">{u.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{u.name}</p>
                          {u.email === me?.email && <span className="text-xs px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">You</span>}
                        </div>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {role && (
                        <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', role.bg, role.color)}>
                          <RoleIcon className="w-3 h-3" />
                          {role.label}
                        </div>
                      )}
                      <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full text-xs', status.bg, status.color)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                        {u.status}
                      </div>
                      {isAdmin && u.email !== me?.email && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditUser(u)} className="p-1.5 rounded-lg text-muted-foreground hover:text-gray-900 hover:bg-slate-100 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteUser(u.id, u.name)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <Modal title="Add Team Member" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            {[
              { key: 'name', label: 'Full Name', placeholder: 'Jane Banda', type: 'text' },
              { key: 'email', label: 'Email Address', placeholder: 'jane@yourbank.co.zm', type: 'email' },
              { key: 'password', label: 'Temporary Password', placeholder: 'Set a password', type: 'password' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">{label}</label>
                <input type={type} value={(form as any)[key]} placeholder={placeholder}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-gray-900 placeholder:text-muted-foreground/50 focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(roleConfig).map(([role, cfg]) => (
                  <button key={role} onClick={() => setForm(prev => ({ ...prev, role }))}
                    className={cn('p-3 rounded-xl border text-left transition-all', form.role === role ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100')}>
                    <p className={cn('text-sm font-medium', cfg.color)}>{cfg.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 text-gray-900 text-sm font-medium hover:bg-slate-100 transition-colors">Cancel</button>
              <button onClick={addUser} disabled={submitting} className="flex-1 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                {submitting ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <Modal title="Edit User" onClose={() => setEditUser(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Full Name</label>
              <input type="text" value={editUser.name}
                onChange={e => setEditUser(prev => prev ? { ...prev, name: e.target.value } : null)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-gray-900 focus:outline-none focus:border-cyan-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(roleConfig).map(([role, cfg]) => (
                  <button key={role} onClick={() => setEditUser(prev => prev ? { ...prev, role } : null)}
                    className={cn('p-3 rounded-xl border text-left transition-all', editUser.role === role ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-200 bg-slate-50')}>
                    <p className={cn('text-sm font-medium', cfg.color)}>{cfg.label}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Status</label>
              <select value={editUser.status} onChange={e => setEditUser(prev => prev ? { ...prev, status: e.target.value } : null)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-gray-900 focus:outline-none focus:border-cyan-500 text-sm">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditUser(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 text-gray-900 text-sm font-medium">Cancel</button>
              <button onClick={updateUser} disabled={submitting} className="flex-1 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium disabled:opacity-50">
                {submitting ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
