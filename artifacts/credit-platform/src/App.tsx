import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

// Pages
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin/dashboard";
import TenantsList from "@/pages/admin/tenants";
import AuditLogs from "@/pages/admin/audit-logs";
import TenantDashboard from "@/pages/tenant/dashboard";
import TenantAnalytics from "@/pages/tenant/analytics";
import ConsentPortal from "@/pages/customer/consent";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, allowedRoles }: { component: any, allowedRoles: string[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  if (user && !allowedRoles.includes(user.role)) {
    if (user.role === 'super_admin') window.location.href = '/admin';
    else if (user.role === 'customer') window.location.href = '/consent';
    else window.location.href = '/dashboard';
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        {() => {
          window.location.href = '/login';
          return null;
        }}
      </Route>

      {/* Super Admin Routes */}
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminDashboard} allowedRoles={['super_admin']} />}
      </Route>
      <Route path="/admin/tenants">
        {() => <ProtectedRoute component={TenantsList} allowedRoles={['super_admin']} />}
      </Route>
      <Route path="/admin/audit-logs">
        {() => <ProtectedRoute component={AuditLogs} allowedRoles={['super_admin']} />}
      </Route>

      {/* Tenant Routes */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={TenantDashboard} allowedRoles={['tenant_admin', 'tenant_user']} />}
      </Route>
      <Route path="/dashboard/analytics">
        {() => <ProtectedRoute component={TenantAnalytics} allowedRoles={['tenant_admin', 'tenant_user']} />}
      </Route>

      {/* Customer Routes */}
      <Route path="/consent">
        {() => <ProtectedRoute component={ConsentPortal} allowedRoles={['customer']} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
