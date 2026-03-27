import React from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { useGetConsentStatus, useGrantConsent, useRevokeConsent } from '@workspace/api-client-react';
import { ShieldCheck, Database, Smartphone, Banknote, FileText, UserCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const DATA_TYPES = [
  { id: 'personal_info', label: 'Personal Information', icon: UserCircle, desc: 'Name, NRC, Date of Birth' },
  { id: 'bank_data', label: 'Bank Account History', icon: Database, desc: 'Transaction history and balances' },
  { id: 'mobile_money', label: 'Mobile Money Usage', icon: Smartphone, desc: 'Airtime and transfer volumes' },
  { id: 'mfi_loans', label: 'Microfinance Loans', icon: Banknote, desc: 'Past and active small loans' },
  { id: 'credit_history', label: 'Credit Bureau Data', icon: FileText, desc: 'Defaults and repayment records' }
];

export default function ConsentPortal() {
  const { apiOptions } = useAuth();
  const { data, isLoading } = useGetConsentStatus(apiOptions);
  const grantMutation = useGrantConsent(apiOptions);
  const revokeMutation = useRevokeConsent(apiOptions);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const activeTypes = new Set(
    data?.consents.filter(c => c.status === 'active').map(c => c.dataType) || []
  );

  const handleToggle = async (typeId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await revokeMutation.mutateAsync({ data: { dataTypes: [typeId] } });
        toast({ title: "Consent revoked" });
      } else {
        await grantMutation.mutateAsync({ data: { dataTypes: [typeId as any] } });
        toast({ title: "Consent granted", description: "Your data securely contributes to your score." });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/consent/status'] });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Action failed", description: e.message });
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-display font-bold text-white mb-4">Data Privacy Control</h1>
          <p className="text-lg text-white/60">You are in full control. Choose which financial data sources can be used to calculate your ZamCredit score.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {DATA_TYPES.map(type => {
              const isActive = activeTypes.has(type.id);
              return (
                <div key={type.id} className={cn(
                  "glass-panel p-6 rounded-2xl transition-all duration-300 border flex items-center justify-between gap-4",
                  isActive ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 opacity-70 hover:opacity-100"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                      isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/50"
                    )}>
                      <type.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{type.label}</h3>
                      <p className="text-sm text-white/60">{type.desc}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleToggle(type.id, isActive)}
                    disabled={grantMutation.isPending || revokeMutation.isPending}
                    className={cn(
                      "relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50",
                      isActive ? "bg-emerald-500" : "bg-white/20"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        isActive ? "translate-x-7" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
