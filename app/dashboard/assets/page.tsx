'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { Logo } from '@/components/logo';
import { createClient } from '@/lib/supabase/client';
import { logActivity } from '@/lib/log-activity';
import { Trash2, Plus, Menu, ArrowLeft, Wallet, Loader2 } from 'lucide-react';

type AssetType = 'bank_deposits' | 'wallet' | 'crypto' | 'stocks' | 'gold' | 'real_estate';

interface Asset {
  id: string;
  asset_type: AssetType;
  account_name: string;
  balance: number;
  account_number: string | null;
  institution_name: string | null;
  description: string | null;
}

const ASSET_TYPE_OPTIONS: { value: AssetType; label: string; icon: string }[] = [
  { value: 'bank_deposits', label: 'Bank Account', icon: '🏦' },
  { value: 'wallet', label: 'Digital Wallet', icon: '👛' },
  { value: 'crypto', label: 'Cryptocurrency', icon: '₿' },
  { value: 'stocks', label: 'Stocks', icon: '📈' },
  { value: 'gold', label: 'Gold', icon: '🪙' },
  { value: 'real_estate', label: 'Real Estate', icon: '🏠' },
];

function assetTypeMeta(type: string) {
  return (
    ASSET_TYPE_OPTIONS.find((o) => o.value === type) ?? {
      value: type as AssetType,
      label: type.replace(/_/g, ' '),
      icon: '💰',
    }
  );
}

export default function AssetsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [assetType, setAssetType] = useState<AssetType>('bank_deposits');
  const [accountName, setAccountName] = useState('');
  const [balance, setBalance] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    const fetchAssets = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (active) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('assets')
        .select('id, asset_type, account_name, balance, account_number, institution_name, description')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!active) return;

      if (error) {
        console.error('[v0] Failed to load assets:', error.message);
        toast.error('Failed to load your assets');
      } else {
        setAssets(data ?? []);
      }
      setLoading(false);
    };

    fetchAssets();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setAccountName('');
    setBalance('');
    setInstitutionName('');
    setAccountNumber('');
    setAssetType('bank_deposits');
    setShowForm(false);
  };

  const handleAddAsset = async (e: FormEvent) => {
    e.preventDefault();
    if (!accountName || !balance) return;

    const numericBalance = Number(balance.replace(/,/g, ''));
    if (Number.isNaN(numericBalance) || numericBalance < 0) {
      toast.error('Enter a valid balance amount');
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error('You must be signed in to add an asset');
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from('assets')
      .insert({
        user_id: user.id,
        asset_type: assetType,
        account_name: accountName,
        balance: numericBalance,
        institution_name: institutionName || null,
        account_number: accountNumber || null,
      })
      .select('id, asset_type, account_name, balance, account_number, institution_name, description')
      .single();

    setSaving(false);

    if (error || !data) {
      console.error('[v0] Failed to add asset:', error?.message);
      toast.error('Failed to add asset');
      return;
    }

    setAssets((prev) => [data, ...prev]);
    resetForm();
    toast.success('Asset added');
    logActivity('asset_added', `Added ${assetTypeMeta(assetType).label}: ${accountName}`);
  };

  const handleDeleteAsset = async (id: string, name: string) => {
    const { error } = await supabase.from('assets').delete().eq('id', id);

    if (error) {
      console.error('[v0] Failed to delete asset:', error.message);
      toast.error('Failed to delete asset');
      return;
    }

    setAssets((prev) => prev.filter((asset) => asset.id !== id));
    toast.success('Asset removed');
    logActivity('asset_removed', `Removed asset: ${name}`);
  };

  const totalBalance = assets.reduce((sum, asset) => sum + Number(asset.balance), 0);

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar isOpen={sidebarOpen} currentPage="assets" />

      <main className={`${sidebarOpen ? 'ml-64' : 'ml-0'} transition-all duration-300`}>
        <header className="bg-primary text-white p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Toggle sidebar"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Digital Assets</h1>
                <p className="text-white/80 text-sm mt-1">Add, view and manage your assets</p>
              </div>
            </div>
            <Logo size="sm" />
          </div>
        </header>

        <div className="p-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-primary">Digital Assets</h1>
              <p className="text-muted-foreground mt-1">Manage your financial assets securely</p>
            </div>
          </div>

          {!loading && (
            <Card className="p-4 mb-8 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Total Assets Value</p>
              <h4 className="text-3xl font-bold text-primary">
                ₹{totalBalance.toLocaleString('en-IN')}
              </h4>
            </Card>
          )}

          {!showForm ? (
            <Button
              onClick={() => setShowForm(true)}
              className="mb-8 h-12 bg-gradient-to-r from-secondary to-primary text-white font-medium flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add New Asset
            </Button>
          ) : (
            <Card className="p-6 mb-8 border-2 border-primary/20">
              <h2 className="text-xl font-bold text-primary mb-4">Add Digital Asset</h2>
              <form onSubmit={handleAddAsset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Asset Type</label>
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value as AssetType)}
                    className="w-full px-4 py-2 border border-input rounded-lg bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {ASSET_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.icon} {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Account Name</label>
                  <Input
                    type="text"
                    placeholder="e.g., My Primary Bank Account"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="bg-muted border-input"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Institution (optional)</label>
                    <Input
                      type="text"
                      placeholder="e.g., HDFC Bank"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      className="bg-muted border-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Account Number (optional)</label>
                    <Input
                      type="text"
                      placeholder="e.g., XXXX1234"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="bg-muted border-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Balance (₹)</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g., 500000"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="bg-muted border-input"
                    required
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex-1 h-10 bg-gradient-to-r from-secondary to-primary text-white font-medium"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Asset'}
                  </Button>
                  <Button
                    type="button"
                    onClick={resetForm}
                    variant="outline"
                    className="flex-1 h-10 border-2 border-primary text-primary hover:bg-primary/10"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Your Assets</h2>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              </div>
            ) : assets.length === 0 ? (
              <Card className="p-8 text-center border-2 border-dashed border-muted">
                <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No assets added yet. Start by adding your first asset.</p>
              </Card>
            ) : (
              assets.map((asset) => {
                const meta = assetTypeMeta(asset.asset_type);
                return (
                  <Card
                    key={asset.id}
                    className="p-6 border-2 border-primary/20 hover:border-primary/40 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-3xl">{meta.icon}</div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {meta.label}
                          {asset.institution_name ? ` · ${asset.institution_name}` : ''}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground">{asset.account_name}</h3>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        ₹{Number(asset.balance).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteAsset(asset.id, asset.account_name)}
                      className="ml-4 p-2 hover:bg-destructive/10 rounded-lg transition-colors text-destructive"
                      aria-label={`Delete ${asset.account_name}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </main>

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-30 p-3 bg-primary text-white rounded-full shadow-lg hover:shadow-xl transition-shadow"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-6 h-6" />
      </button>
    </div>
  );
}
