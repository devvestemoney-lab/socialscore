import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import {
  useListTenants, useDeleteTenant, useUpdateTenant, useCreateTenant
} from '@workspace/api-client-react';
import type { CreateTenantRequest, UpdateTenantRequest } from '@workspace/api-client-react';
import { Plus, Search, Edit2, Trash2, Power, X, Building2, Mail, Lock, User, Code } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const TENANT_TYPES = ['bank', 'mfi', 'fintech', 'mno'] as const;

interface CreateForm {
  name: string;
  code: string;
  type: string;
  contactEmail: string;
  adminName: string;
  adminPassword: string;
}

interface EditForm {
  name: string;
  contactEmail: string;
  type: string;
}

const defaultCreate: CreateForm = { name: '', code: '', type: 'bank', contactEmail: '', adminName: '', adminPassword: '' };

export default function TenantsList() {
  const { apiOptions } = useAuth();
  const { data, isLoading } = useListTenants(apiOptions);
  const deleteMutation = useDeleteTenant(apiOptions);
  const updateMutation = useUpdateTenant(apiOptions);
  const createMutation = useCreateTenant({ request: apiOptions.request });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(defaultCreate);
  const [createLoading, setCreateLoading] = useState(false);

  const [editTenant, setEditTenant] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: '', contactEmail: '', type: '' });
  const [editLoading, setEditLoading] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });

  const tenants = (data?.tenants ?? []).filter(t =>
    !search ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleStatusToggle = async (tenantId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      await updateMutation.mutateAsync({ tenantId, data: { status: newStatus as any } });
      invalidate();
      toast({ title: `Tenant ${newStatus === 'active' ? 'activated' : 'suspended'}` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to update status', description: e.message });
    }
  };

  const handleDelete = async (tenantId: string, name: string) => {
    if (!confirm(`Delete tenant "${name}"? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync({ tenantId });
      invalidate();
      toast({ title: 'Tenant deleted successfully' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to delete', description: e.message });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await createMutation.mutateAsync({ data: createForm as unknown as CreateTenantRequest });
      invalidate();
      toast({ title: 'Tenant created successfully', description: `${createForm.name} has been added to the platform.` });
      setShowCreate(false);
      setCreateForm(defaultCreate);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to create tenant', description: e.message });
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (tenant: any) => {
    setEditTenant(tenant);
    setEditForm({ name: tenant.name, contactEmail: tenant.contactEmail ?? '', type: tenant.type });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTenant) return;
    setEditLoading(true);
    try {
      await updateMutation.mutateAsync({ tenantId: editTenant.id, data: editForm as UpdateTenantRequest });
      invalidate();
      toast({ title: 'Tenant updated successfully' });
      setEditTenant(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to update tenant', description: e.message });
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Tenant Management</h1>
          <p className="text-muted-foreground">Manage institutions accessing the ZamCredit platform.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Add Tenant
        </button>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tenants..."
              className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <span className="text-sm text-white/40 whitespace-nowrap">{tenants.length} tenants</span>
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[820px]">
              <thead>
                <tr className="border-b border-white/5 text-xs text-white/50 uppercase tracking-wider font-semibold bg-white/[0.01]">
                  <th className="p-4">Name / Code</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">API Usage (MTD)</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Created</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-white/30">
                      No tenants found. Add one to get started.
                    </td>
                  </tr>
                ) : tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="font-medium text-white">{tenant.name}</div>
                      <div className="text-xs text-cyan-400/70 font-mono mt-0.5">{tenant.code}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                        {tenant.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                        tenant.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', tenant.status === 'active' ? 'bg-emerald-400' : 'bg-red-400')} />
                        {tenant.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm">
                      <span className="text-white font-mono">{tenant.apiCallsThisMonth.toLocaleString()}</span>
                      <span className="text-white/40 ml-1">calls</span>
                    </td>
                    <td className="p-4 text-sm text-white/50 truncate max-w-[150px]">
                      {tenant.contactEmail ?? '—'}
                    </td>
                    <td className="p-4 text-sm text-white/60 whitespace-nowrap">
                      {format(new Date(tenant.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(tenant)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleStatusToggle(tenant.id, tenant.status)}
                          className={cn(
                            'p-2 rounded-lg transition-colors',
                            tenant.status === 'active'
                              ? 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                          )}
                          title={tenant.status === 'active' ? 'Suspend' : 'Activate'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tenant.id, tenant.name)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Tenant Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-8 relative animate-in fade-in zoom-in-95 duration-300">
            <button
              onClick={() => setShowCreate(false)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-display font-bold text-white mb-2">Add New Tenant</h2>
            <p className="text-muted-foreground mb-6 text-sm">Onboard a new financial institution to the platform.</p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Institution Name</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      required
                      value={createForm.name}
                      onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Zanaco Bank"
                      className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Tenant Code</label>
                  <div className="relative">
                    <Code className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      required
                      value={createForm.code}
                      onChange={e => setCreateForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. ZANACO"
                      className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Institution Type</label>
                  <select
                    value={createForm.type}
                    onChange={e => setCreateForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors capitalize"
                  >
                    {TENANT_TYPES.map(t => (
                      <option key={t} value={t} className="bg-slate-900">{t.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Contact Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="email"
                      required
                      value={createForm.contactEmail}
                      onChange={e => setCreateForm(p => ({ ...p, contactEmail: e.target.value }))}
                      placeholder="contact@institution.zm"
                      className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Admin Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      required
                      value={createForm.adminName}
                      onChange={e => setCreateForm(p => ({ ...p, adminName: e.target.value }))}
                      placeholder="Admin Full Name"
                      className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Admin Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={createForm.adminPassword}
                      onChange={e => setCreateForm(p => ({ ...p, adminPassword: e.target.value }))}
                      placeholder="Min 8 characters"
                      className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 rounded-xl font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {createLoading ? 'Creating...' : 'Create Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tenant Modal */}
      {editTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-3xl p-8 relative animate-in fade-in zoom-in-95 duration-300">
            <button
              onClick={() => setEditTenant(null)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-display font-bold text-white mb-2">Edit Tenant</h2>
            <p className="text-sm text-white/50 mb-6 font-mono">{editTenant.code}</p>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Institution Name</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Contact Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="email"
                    value={editForm.contactEmail}
                    onChange={e => setEditForm(p => ({ ...p, contactEmail: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Institution Type</label>
                <select
                  value={editForm.type}
                  onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  {TENANT_TYPES.map(t => (
                    <option key={t} value={t} className="bg-slate-900">{t.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditTenant(null)}
                  className="flex-1 py-3 rounded-xl font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
