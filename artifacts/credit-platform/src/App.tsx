import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

// Pages
import Landing from "@/pages/landing";
import Login from "@/pages/login";

// Super Admin
import AdminDashboard from "@/pages/admin/dashboard";
import TenantsList from "@/pages/admin/tenants";
import AuditLogs from "@/pages/admin/audit-logs";
import ScoringModels from "@/pages/admin/scoring-models";
import DataSources from "@/pages/admin/data-sources";
import FraudMonitor from "@/pages/admin/fraud";
import Billing from "@/pages/admin/billing";
import Institutions from "@/pages/admin/institutions";
import UsersAccess from "@/pages/admin/users-access";
import RolesPermissions from "@/pages/admin/roles";
import ConsumerRegistry from "@/pages/admin/consumers";
import CreditReports from "@/pages/admin/credit-reports";
import CreditInquiries from "@/pages/admin/credit-inquiries";
import CreditScores from "@/pages/admin/credit-scores";
import DataContributions from "@/pages/admin/data-contributions";
import DataQuality from "@/pages/admin/data-quality";
import DataProcessing from "@/pages/admin/data-processing";
import RiskSegmentation from "@/pages/admin/risk-segmentation";
import AdminPortfolio from "@/pages/admin/portfolio";
import AlertCenter from "@/pages/admin/alerts";
import Disputes from "@/pages/admin/disputes";
import ConsentManagement from "@/pages/admin/consent-management";
import ApiManagement from "@/pages/admin/api-management";
import Integrations from "@/pages/admin/integrations";
import UsageMetering from "@/pages/admin/usage-metering";
import PricingPlans from "@/pages/admin/pricing-plans";
import RevenueAnalytics from "@/pages/admin/revenue-analytics";
import SystemSettings from "@/pages/admin/system-settings";
import FeatureManagement from "@/pages/admin/feature-management";
import Compliance from "@/pages/admin/compliance";
import SystemHealth from "@/pages/admin/system-health";

// Tenant
import TenantDashboard from "@/pages/tenant/dashboard";
import TenantAnalytics from "@/pages/tenant/analytics";
import TenantUsers from "@/pages/tenant/users";
import PortfolioMonitoring from "@/pages/tenant/portfolio";
import ConsumerSearch from "@/pages/tenant/consumer-search";
import TenantCreditReports from "@/pages/tenant/credit-reports";
import TenantCreditInquiries from "@/pages/tenant/credit-inquiries";
import Monitoring from "@/pages/tenant/monitoring";
import ConsumersDirectory from "@/pages/tenant/consumers-directory";
import SavedConsumers from "@/pages/tenant/saved-consumers";
import Watchlists from "@/pages/tenant/watchlists";
import ConsumerActivity from "@/pages/tenant/consumer-activity";
import ScoreDistribution from "@/pages/tenant/score-distribution";
import TenantRiskSegmentation from "@/pages/tenant/risk-segmentation";
import EarlyWarnings from "@/pages/tenant/early-warnings";
import SubmitData from "@/pages/tenant/submit-data";
import DataUploads from "@/pages/tenant/data-uploads";
import SubmissionHistory from "@/pages/tenant/submission-history";
import TenantDataQuality from "@/pages/tenant/data-quality";
import ValidationErrors from "@/pages/tenant/validation-errors";
import ActiveDisputes from "@/pages/tenant/disputes-active";
import Investigations from "@/pages/tenant/investigations";
import ResolvedCases from "@/pages/tenant/resolved-cases";
import SlaTracking from "@/pages/tenant/sla-tracking";
import ConsumerAlerts from "@/pages/tenant/consumer-alerts";
import PortfolioAlerts from "@/pages/tenant/portfolio-alerts";
import Notifications from "@/pages/tenant/notifications";
import AlertRules from "@/pages/tenant/alert-rules";
import ApiDashboard from "@/pages/tenant/api-dashboard";
import ApiCredentials from "@/pages/tenant/api-credentials";
import ApiLogs from "@/pages/tenant/api-logs";
import Webhooks from "@/pages/tenant/webhooks";
import TenantIntegrations from "@/pages/tenant/integrations";
import UsageOverview from "@/pages/tenant/usage-overview";
import ReportUsage from "@/pages/tenant/report-usage";
import ApiUsage from "@/pages/tenant/api-usage";
import TenantBilling from "@/pages/tenant/billing";
import Subscription from "@/pages/tenant/subscription";
import OrganizationProfile from "@/pages/tenant/organization";
import TenantRoles from "@/pages/tenant/roles";
import Branches from "@/pages/tenant/branches";
import SecuritySettings from "@/pages/tenant/security";
import TenantAuditLogs from "@/pages/tenant/audit-logs";
import AccessHistory from "@/pages/tenant/access-history";
import ConsentRecords from "@/pages/tenant/consent-records";
import ComplianceReports from "@/pages/tenant/compliance-reports";
import HelpCenter from "@/pages/tenant/help";
import Documentation from "@/pages/tenant/docs";
import ApiDocs from "@/pages/tenant/api-docs";
import ContactSupport from "@/pages/tenant/support";

// Customer
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

const ADMIN = ['super_admin'];
const TENANT = ['tenant_admin', 'tenant_user'];
const TENANT_ADMIN = ['tenant_admin'];
const CUSTOMER = ['customer'];

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />

      {/* Super Admin Routes */}
      <Route path="/admin">{() => <ProtectedRoute component={AdminDashboard} allowedRoles={ADMIN} />}</Route>
      {/* Tenant Management */}
      <Route path="/admin/tenants">{() => <ProtectedRoute component={TenantsList} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/institutions">{() => <ProtectedRoute component={Institutions} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/users">{() => <ProtectedRoute component={UsersAccess} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/roles">{() => <ProtectedRoute component={RolesPermissions} allowedRoles={ADMIN} />}</Route>
      {/* Consumer & Credit */}
      <Route path="/admin/consumers">{() => <ProtectedRoute component={ConsumerRegistry} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/credit-reports">{() => <ProtectedRoute component={CreditReports} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/credit-inquiries">{() => <ProtectedRoute component={CreditInquiries} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/credit-scores">{() => <ProtectedRoute component={CreditScores} allowedRoles={ADMIN} />}</Route>
      {/* Data Ecosystem */}
      <Route path="/admin/data-contributions">{() => <ProtectedRoute component={DataContributions} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/data-quality">{() => <ProtectedRoute component={DataQuality} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/data-sources">{() => <ProtectedRoute component={DataSources} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/data-processing">{() => <ProtectedRoute component={DataProcessing} allowedRoles={ADMIN} />}</Route>
      {/* Risk & Intelligence */}
      <Route path="/admin/scoring-models">{() => <ProtectedRoute component={ScoringModels} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/risk-segmentation">{() => <ProtectedRoute component={RiskSegmentation} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/portfolio">{() => <ProtectedRoute component={AdminPortfolio} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/fraud">{() => <ProtectedRoute component={FraudMonitor} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/alerts">{() => <ProtectedRoute component={AlertCenter} allowedRoles={ADMIN} />}</Route>
      {/* Operations */}
      <Route path="/admin/disputes">{() => <ProtectedRoute component={Disputes} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/consent-management">{() => <ProtectedRoute component={ConsentManagement} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/api-management">{() => <ProtectedRoute component={ApiManagement} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/integrations">{() => <ProtectedRoute component={Integrations} allowedRoles={ADMIN} />}</Route>
      {/* Commercial */}
      <Route path="/admin/usage">{() => <ProtectedRoute component={UsageMetering} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/pricing">{() => <ProtectedRoute component={PricingPlans} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/billing">{() => <ProtectedRoute component={Billing} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/revenue">{() => <ProtectedRoute component={RevenueAnalytics} allowedRoles={ADMIN} />}</Route>
      {/* Administration */}
      <Route path="/admin/settings">{() => <ProtectedRoute component={SystemSettings} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/features">{() => <ProtectedRoute component={FeatureManagement} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/audit-logs">{() => <ProtectedRoute component={AuditLogs} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/compliance">{() => <ProtectedRoute component={Compliance} allowedRoles={ADMIN} />}</Route>
      <Route path="/admin/health">{() => <ProtectedRoute component={SystemHealth} allowedRoles={ADMIN} />}</Route>

      {/* Tenant Routes */}
      <Route path="/dashboard">{() => <ProtectedRoute component={TenantDashboard} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/analytics">{() => <ProtectedRoute component={TenantAnalytics} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/portfolio">{() => <ProtectedRoute component={PortfolioMonitoring} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/users">{() => <ProtectedRoute component={TenantUsers} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/consumer-search">{() => <ProtectedRoute component={ConsumerSearch} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/credit-reports">{() => <ProtectedRoute component={TenantCreditReports} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/credit-inquiries">{() => <ProtectedRoute component={TenantCreditInquiries} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/monitoring">{() => <ProtectedRoute component={Monitoring} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/consumers">{() => <ProtectedRoute component={ConsumersDirectory} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/saved-consumers">{() => <ProtectedRoute component={SavedConsumers} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/watchlists">{() => <ProtectedRoute component={Watchlists} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/consumer-activity">{() => <ProtectedRoute component={ConsumerActivity} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/score-distribution">{() => <ProtectedRoute component={ScoreDistribution} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/risk-segmentation">{() => <ProtectedRoute component={TenantRiskSegmentation} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/early-warnings">{() => <ProtectedRoute component={EarlyWarnings} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/submit-data">{() => <ProtectedRoute component={SubmitData} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/data-uploads">{() => <ProtectedRoute component={DataUploads} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/submission-history">{() => <ProtectedRoute component={SubmissionHistory} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/data-quality">{() => <ProtectedRoute component={TenantDataQuality} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/validation-errors">{() => <ProtectedRoute component={ValidationErrors} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/disputes">{() => <ProtectedRoute component={ActiveDisputes} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/investigations">{() => <ProtectedRoute component={Investigations} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/resolved-cases">{() => <ProtectedRoute component={ResolvedCases} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/sla-tracking">{() => <ProtectedRoute component={SlaTracking} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/consumer-alerts">{() => <ProtectedRoute component={ConsumerAlerts} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/portfolio-alerts">{() => <ProtectedRoute component={PortfolioAlerts} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/notifications">{() => <ProtectedRoute component={Notifications} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/alert-rules">{() => <ProtectedRoute component={AlertRules} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/api">{() => <ProtectedRoute component={ApiDashboard} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/api-credentials">{() => <ProtectedRoute component={ApiCredentials} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/api-logs">{() => <ProtectedRoute component={ApiLogs} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/webhooks">{() => <ProtectedRoute component={Webhooks} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/integrations">{() => <ProtectedRoute component={TenantIntegrations} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/usage">{() => <ProtectedRoute component={UsageOverview} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/report-usage">{() => <ProtectedRoute component={ReportUsage} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/api-usage">{() => <ProtectedRoute component={ApiUsage} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/billing">{() => <ProtectedRoute component={TenantBilling} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/subscription">{() => <ProtectedRoute component={Subscription} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/organization">{() => <ProtectedRoute component={OrganizationProfile} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/roles">{() => <ProtectedRoute component={TenantRoles} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/branches">{() => <ProtectedRoute component={Branches} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/security">{() => <ProtectedRoute component={SecuritySettings} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/audit-logs">{() => <ProtectedRoute component={TenantAuditLogs} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/access-history">{() => <ProtectedRoute component={AccessHistory} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/consent-records">{() => <ProtectedRoute component={ConsentRecords} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/compliance-reports">{() => <ProtectedRoute component={ComplianceReports} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/help">{() => <ProtectedRoute component={HelpCenter} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/docs">{() => <ProtectedRoute component={Documentation} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/api-docs">{() => <ProtectedRoute component={ApiDocs} allowedRoles={TENANT} />}</Route>
      <Route path="/dashboard/support">{() => <ProtectedRoute component={ContactSupport} allowedRoles={TENANT} />}</Route>

      {/* Customer Routes */}
      <Route path="/consent">{() => <ProtectedRoute component={ConsentPortal} allowedRoles={CUSTOMER} />}</Route>

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
