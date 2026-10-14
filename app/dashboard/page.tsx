'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { Logo } from '@/components/logo';
import {
  Menu,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  Shield,
  Plus,
  Settings,
  Phone,
  Activity,
  Wallet,
  LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { logActivity } from '@/lib/log-activity';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardData {
  fullName: string;
  isSafe: boolean;
  lastConfirmedAt: string | null;
  inactivityThresholdDays: number;
  totalAssetsValue: number;
  assetCount: number;
}

function formatRelativeTime(iso: string | null) {
  if (!iso) return 'Never';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const loadDashboard = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) {
      router.push('/');
      return;
    }

    const [userRow, safetyRow, profileRow, assetsRows] = await Promise.all([
      supabase.from('users').select('full_name').eq('id', user.id).maybeSingle(),
      supabase
        .from('safety_status')
        .select('is_safe, last_confirmed_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('user_profiles')
        .select('inactivity_threshold_days')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.from('assets').select('balance').eq('user_id', user.id),
    ]);

    const totalAssetsValue = (assetsRows.data ?? []).reduce(
      (sum, row) => sum + Number(row.balance ?? 0),
      0
    );

    setData({
      fullName: userRow.data?.full_name ?? 'there',
      isSafe: safetyRow.data?.is_safe ?? true,
      lastConfirmedAt: safetyRow.data?.last_confirmed_at ?? null,
      inactivityThresholdDays: profileRow.data?.inactivity_threshold_days ?? 90,
      totalAssetsValue,
      assetCount: assetsRows.data?.length ?? 0,
    });
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) {
      setCheckingIn(false);
      return;
    }

    const { error } = await supabase
      .from('safety_status')
      .update({
        is_safe: true,
        last_confirmed_at: new Date().toISOString(),
        confirmation_type: 'manual',
      })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Could not confirm your status. Please try again.');
      setCheckingIn(false);
      return;
    }

    await logActivity('safety_check_in', 'Confirmed active status from dashboard');
    toast.success("You're marked as active");
    await loadDashboard();
    setCheckingIn(false);
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardSidebar isOpen={sidebarOpen} currentPage="dashboard" />
        <main className={`${sidebarOpen ? 'ml-64' : 'ml-0'} transition-all duration-300 p-8`}>
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <DashboardSidebar isOpen={sidebarOpen} currentPage="dashboard" />

      {/* Main Content */}
      <main className={`${sidebarOpen ? 'ml-64' : 'ml-0'} transition-all duration-300`}>
        {/* Header */}
        <header className="bg-primary text-white p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Welcome, {data.fullName}</h1>
                <p className="text-white/80 text-sm mt-1">Manage your assets and inheritance protection</p>
              </div>
            </div>
            <Logo size="sm" />
          </div>
        </header>

        {/* Content */}
        <div className="p-8 max-w-6xl mx-auto">
          {/* Status Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-6 border-2 border-primary/20 hover:border-primary/40 transition-colors">
              <p className="text-sm text-muted-foreground mb-2">Status</p>
              <div className="flex items-center gap-2">
                {data.isSafe ? (
                  <CheckCircle className="w-5 h-5 text-accent" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                )}
                <h3 className="text-2xl font-bold text-primary">{data.isSafe ? 'Active' : 'Inactive'}</h3>
              </div>
            </Card>

            <Card className="p-6 border-2 border-primary/20 hover:border-primary/40 transition-colors">
              <p className="text-sm text-muted-foreground mb-2">Last Activity</p>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="text-2xl font-bold text-foreground">
                  {formatRelativeTime(data.lastConfirmedAt)}
                </h3>
              </div>
            </Card>

            <Card className="p-6 border-2 border-primary/20 hover:border-primary/40 transition-colors">
              <p className="text-sm text-muted-foreground mb-2">Inheritance Rule</p>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="text-2xl font-bold text-foreground">{data.inactivityThresholdDays} Days</h3>
              </div>
            </Card>

            <Card className="p-6 border-2 border-primary/20 hover:border-primary/40 transition-colors">
              <p className="text-sm text-muted-foreground mb-2">Total Assets</p>
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                <h3 className="text-2xl font-bold text-foreground">{formatCurrency(data.totalAssetsValue)}</h3>
              </div>
            </Card>
          </div>

          {/* Inheritance Status */}
          <Card
            className={`p-6 border-2 mb-8 ${
              data.isSafe ? 'border-accent/30 bg-accent/5' : 'border-destructive/30 bg-destructive/5'
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {data.isSafe ? (
                  <CheckCircle className="w-8 h-8 text-accent flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-destructive flex-shrink-0" />
                )}
                <div>
                  <h3 className="text-lg font-bold text-foreground">Inheritance Status</h3>
                  <p className="text-muted-foreground text-sm">
                    Your inheritance protection is{' '}
                    <span className={`font-semibold ${data.isSafe ? 'text-accent' : 'text-destructive'}`}>
                      {data.isSafe ? 'SAFE' : 'AT RISK'}
                    </span>
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Last confirmed {formatRelativeTime(data.lastConfirmedAt).toLowerCase()}
              </p>
            </div>
          </Card>

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <Button
              onClick={() => router.push('/dashboard/assets')}
              className="h-16 bg-gradient-to-r from-secondary to-primary text-white font-semibold text-base hover:shadow-lg transition-shadow flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add / View Assets
            </Button>

            <Button
              onClick={() => router.push('/dashboard/inheritance-rules')}
              className="h-16 bg-gradient-to-r from-secondary to-primary text-white font-semibold text-base hover:shadow-lg transition-shadow flex items-center justify-center gap-2"
            >
              <Settings className="w-5 h-5" />
              Set Inheritance Rules
            </Button>

            <Button
              onClick={() => router.push('/dashboard/emergency-contacts')}
              className="h-16 bg-gradient-to-r from-secondary to-primary text-white font-semibold text-base hover:shadow-lg transition-shadow flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Emergency Contact
            </Button>

            <Button
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="h-16 bg-accent text-white font-bold text-base hover:shadow-lg transition-shadow flex items-center justify-center gap-2 md:col-span-2 lg:col-span-1 disabled:opacity-60"
            >
              <CheckCircle className="w-5 h-5" />
              {checkingIn ? 'Confirming...' : "I'm Active"}
            </Button>

            <Button
              onClick={() => router.push('/dashboard/activity-logs')}
              variant="outline"
              className="h-16 border-2 border-primary text-primary font-semibold text-base hover:bg-primary/10 flex items-center justify-center gap-2"
            >
              <Activity className="w-5 h-5" />
              View Logs
            </Button>
          </div>

          {/* Quick Access Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button
              onClick={() => router.push('/dashboard/assets')}
              className="p-6 border-2 border-primary/20 rounded-lg hover:border-primary/40 hover:bg-accent/5 transition-colors text-left"
            >
              <Plus className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-xl font-bold text-foreground">Assets</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {data.assetCount} asset{data.assetCount === 1 ? '' : 's'} on record
              </p>
            </button>

            <button
              onClick={() => router.push('/dashboard/documents')}
              className="p-6 border-2 border-primary/20 rounded-lg hover:border-primary/40 hover:bg-accent/5 transition-colors text-left"
            >
              <Settings className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-xl font-bold text-foreground">Documents</h3>
              <p className="text-sm text-muted-foreground mt-2">Access important documents</p>
            </button>

            <button
              onClick={() => router.push('/dashboard/account-info')}
              className="p-6 border-2 border-primary/20 rounded-lg hover:border-primary/40 hover:bg-accent/5 transition-colors text-left"
            >
              <Users className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-xl font-bold text-foreground">Account Info</h3>
              <p className="text-sm text-muted-foreground mt-2">View your account details</p>
            </button>
          </div>

          {/* Security Notice */}
          <Card className="p-6 border-l-4 border-l-primary bg-primary/5">
            <div className="flex items-start gap-4">
              <LogOut className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-foreground mb-2">Security Notice</h4>
                <p className="text-sm text-muted-foreground">
                  Keep your account secure by regularly checking your activity logs, updating your emergency
                  contacts, and confirming your active status monthly.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-30 p-3 bg-primary text-white rounded-full shadow-lg hover:shadow-xl transition-shadow"
      >
        <Menu className="w-6 h-6" />
      </button>
    </div>
  );
}
