import React from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { useListTenants, useDeleteTenant, useUpdateTenant } from '@workspace/api-client-react';
import { Plus, Search, MoreVertical, Edit2, Trash2, Power } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function TenantsList() {
  const { apiOptions } = useAuth();
  const { data, isLoading } = useListTenants(apiOptions);
  const deleteMutation = useDeleteTenant(apiOptions);
  const updateMutation = useUpdateTenant(apiOptions);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleStatusToggle = async (tenantId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      await updateMutation.mutateAsync({ 
        tenantId, 
        data: { status: newStatus as any } 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      toast({ title: `Tenant ${newStatus}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to update status", description: e.message });
    }
  };

  const handleDelete = async (tenantId: string) => {
    if(!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) return;
    try {
      await deleteMutation.mutateAsync({ tenantId });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      toast({ title: "Tenant deleted successfully" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to delete", description: e.message });
    }
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Tenant Management</h1>
          <p className="text-muted-foreground">Manage institutions accessing the credit platform.</p>
        </div>
        <button className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" />
          Add Tenant
        </button>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input 
              type="text" 
              placeholder="Search tenants..." 
              className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/5 text-xs text-white/50 uppercase tracking-wider font-semibold">
                  <th className="p-4">Name / Code</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">API Usage</th>
                  <th className="p-4">Created</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data?.tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="font-medium text-white">{tenant.name}</div>
                      <div className="text-xs text-white/40 font-mono mt-0.5">{tenant.code}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-white/80 capitalize">{tenant.type}</span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        tenant.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tenant.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm">
                      <div className="text-white">{tenant.apiCallsThisMonth.toLocaleString()} <span className="text-white/40">calls MTD</span></div>
                    </td>
                    <td className="p-4 text-sm text-white/60">
                      {format(new Date(tenant.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleStatusToggle(tenant.id, tenant.status)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                          title={tenant.status === 'active' ? 'Suspend' : 'Activate'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(tenant.id)}
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
    </Layout>
  );
}
