'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { Logo } from '@/components/logo';
import { Menu, Mail, Phone, MapPin, Calendar, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { logActivity } from '@/lib/log-activity';
import { toast } from 'sonner';

interface AccountInfo {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  dateOfBirth: string;
  memberSince: string;
}

const emptyInfo: AccountInfo = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  dateOfBirth: '',
  memberSince: '',
};

export default function AccountInfoPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [accountInfo, setAccountInfo] = useState<AccountInfo>(emptyInfo);
  const [form, setForm] = useState<AccountInfo>(emptyInfo);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function loadAccountInfo() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      const [{ data: userRow, error: userError }, { data: profileRow, error: profileError }] =
        await Promise.all([
          supabase.from('users').select('*').eq('id', user.id).single(),
          supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
        ]);

      if (userError) {
        console.error('[v0] Failed to load user:', userError.message);
        toast.error('Could not load your account information.');
        setLoading(false);
        return;
      }
      if (profileError) {
        console.error('[v0] Failed to load user profile:', profileError.message);
      }

      const loaded: AccountInfo = {
        fullName: userRow?.full_name ?? '',
        email: userRow?.email ?? '',
        phone: userRow?.phone_number ?? '',
        address: profileRow?.address ?? '',
        city: profileRow?.city ?? '',
        state: profileRow?.state ?? '',
        pincode: profileRow?.pincode ?? '',
        dateOfBirth: profileRow?.date_of_birth ?? '',
        memberSince: userRow?.created_at ?? '',
      };

      setAccountInfo(loaded);
      setForm(loaded);
      setLoading(false);
    }

    loadAccountInfo();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/');
      return;
    }

    const [{ error: userError }, { error: profileError }] = await Promise.all([
      supabase
        .from('users')
        .update({
          full_name: form.fullName || null,
          phone_number: form.phone || null,
        })
        .eq('id', user.id),
      supabase
        .from('user_profiles')
        .update({
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          pincode: form.pincode || null,
          date_of_birth: form.dateOfBirth || null,
        })
        .eq('user_id', user.id),
    ]);

    setSaving(false);

    if (userError || profileError) {
      console.error('[v0] Failed to save account info:', userError?.message ?? profileError?.message);
      toast.error('Failed to save changes. Please try again.');
      return;
    }

    setAccountInfo(form);
    setIsEditing(false);
    toast.success('Account information updated.');
    logActivity('account_info_updated', 'Updated account information');
  };

  const handleCancel = () => {
    setForm(accountInfo);
    setIsEditing(false);
  };

  const formattedAddress = [accountInfo.address, accountInfo.city, accountInfo.state, accountInfo.pincode]
    .filter(Boolean)
    .join(', ');

  const memberSinceFormatted = accountInfo.memberSince
    ? new Date(accountInfo.memberSince).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <DashboardSidebar isOpen={sidebarOpen} currentPage="account-info" />

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
                <h1 className="text-2xl font-bold">Account Information</h1>
                <p className="text-white/80 text-sm mt-1">View and manage your account details</p>
              </div>
            </div>
            <Logo size="sm" />
          </div>
        </header>

        {/* Content */}
        <div className="p-8 max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Account Information</h2>
            <p className="text-muted-foreground">Your personal details and account status</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Main Account Card */}
              <Card className="p-8 mb-6 border-2 border-primary/20">
                <div className="space-y-6">
                  {/* Name */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Full Name</p>
                    {isEditing ? (
                      <Input
                        value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        className="text-lg font-semibold max-w-sm"
                      />
                    ) : (
                      <p className="text-2xl font-bold text-foreground">
                        {accountInfo.fullName || 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Account Status</p>
                    <span className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full font-medium text-sm">
                      Active
                    </span>
                  </div>

                  <div className="border-t border-border pt-6">
                    <h3 className="font-bold text-foreground mb-4">Contact Information</h3>

                    <div className="space-y-4">
                      {/* Email (read-only, tied to auth) */}
                      <div className="flex items-center gap-4">
                        <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium text-foreground">{accountInfo.email}</p>
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="flex items-center gap-4">
                        <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Phone Number</p>
                          {isEditing ? (
                            <Input
                              value={form.phone}
                              onChange={(e) => setForm({ ...form, phone: e.target.value })}
                              placeholder="+91 98765 43210"
                              className="max-w-sm mt-1"
                            />
                          ) : (
                            <p className="font-medium text-foreground">
                              {accountInfo.phone || 'Not set'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <div className="flex items-start gap-4">
                        <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Address</p>
                          {isEditing ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 max-w-sm">
                              <div className="sm:col-span-2 space-y-1">
                                <Label className="text-xs text-muted-foreground">Street Address</Label>
                                <Input
                                  value={form.address}
                                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">City</Label>
                                <Input
                                  value={form.city}
                                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">State</Label>
                                <Input
                                  value={form.state}
                                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Pincode</Label>
                                <Input
                                  value={form.pincode}
                                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                                />
                              </div>
                            </div>
                          ) : (
                            <p className="font-medium text-foreground">
                              {formattedAddress || 'Not set'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Date of Birth */}
                      <div className="flex items-center gap-4">
                        <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Date of Birth</p>
                          {isEditing ? (
                            <Input
                              type="date"
                              value={form.dateOfBirth}
                              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                              className="max-w-sm mt-1"
                            />
                          ) : (
                            <p className="font-medium text-foreground">
                              {accountInfo.dateOfBirth || 'Not set'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-6">
                    <h3 className="font-bold text-foreground mb-4">Account Activity</h3>

                    <div className="flex items-center gap-4">
                      <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Member Since</p>
                        <p className="font-medium text-foreground">{memberSinceFormatted}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button onClick={() => router.back()} variant="outline" className="border-2 border-primary">
                  Back
                </Button>
                {isEditing ? (
                  <>
                    <Button onClick={handleCancel} variant="outline" disabled={saving}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-gradient-to-r from-secondary to-primary text-white"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-gradient-to-r from-secondary to-primary text-white"
                  >
                    Edit Profile
                  </Button>
                )}
              </div>
            </>
          )}
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
