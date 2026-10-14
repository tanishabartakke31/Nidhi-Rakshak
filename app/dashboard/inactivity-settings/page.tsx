'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { Logo } from '@/components/logo';
import { createClient } from '@/lib/supabase/client';
import { logActivity } from '@/lib/log-activity';
import { toast } from 'sonner';

export default function InactivitySettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [days, setDays] = useState('90');
  const [enabled, setEnabled] = useState(true);
  const [lastActive, setLastActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push('/'); return; }
      const [{ data: profile }, { data: safety }] = await Promise.all([
        supabase.from('user_profiles').select('inactivity_threshold_days').eq('user_id', auth.user.id).maybeSingle(),
        supabase.from('safety_status').select('is_safe, last_confirmed_at').eq('user_id', auth.user.id).maybeSingle(),
      ]);
      if (!mounted) return;
      if (profile?.inactivity_threshold_days) setDays(String(profile.inactivity_threshold_days));
      if (safety) { setEnabled(safety.is_safe); setLastActive(safety.last_confirmed_at); }
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [router]);

  const save = async () => {
    const threshold = Number(days);
    if (!Number.isInteger(threshold) || threshold < 7 || threshold > 365) { toast.error('Choose between 7 and 365 days'); return; }
    setSaving(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push('/'); return; }
    const { error } = await supabase.from('user_profiles').upsert({ user_id: auth.user.id, inactivity_threshold_days: threshold }, { onConflict: 'user_id' });
    if (error) toast.error('Failed to save settings');
    else { toast.success('Inactivity settings saved'); await logActivity('inactivity_settings_updated', `Set inactivity threshold to ${threshold} days`); }
    setSaving(false);
  };

  const confirmActive = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push('/'); return; }
    const now = new Date().toISOString();
    const { error } = await supabase.from('safety_status').upsert({ user_id: auth.user.id, is_safe: true, last_confirmed_at: now, confirmation_type: 'manual' }, { onConflict: 'user_id' });
    if (error) toast.error('Failed to update safety status');
    else { setEnabled(true); setLastActive(now); toast.success('Your active status was confirmed'); await logActivity('active_check_in', 'User confirmed they are active'); }
    setSaving(false);
  };

  return <div className="min-h-screen bg-background"><DashboardSidebar isOpen={sidebarOpen} currentPage="inactivity-settings" /><main className={`${sidebarOpen ? 'ml-64' : 'ml-0'} transition-all duration-300`}><header className="bg-primary text-white p-6 shadow-lg"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/20 rounded-lg" aria-label="Toggle navigation"><Menu className="w-6 h-6" /></button><div><h1 className="text-2xl font-bold">Inactivity Protection</h1><p className="text-white/80 text-sm mt-1">Keep your safety timer and protection settings current</p></div></div><Logo size="sm" /></div></header><div className="p-8 max-w-4xl mx-auto space-y-6">{loading ? <Card className="p-8 text-center text-muted-foreground">Loading settings...</Card> : <><Card className="p-6 border-primary/20"><div className="flex items-start gap-3"><AlertCircle className="w-5 h-5 text-primary mt-1" /><div><h2 className="text-xl font-bold text-foreground">How it works</h2><p className="text-sm text-muted-foreground mt-1">If you do not confirm activity within your threshold, your configured protection process can begin. Confirm activity any time to reset the timer.</p></div></div></Card><Card className="p-6"><div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-bold text-foreground">Protection threshold</h2><p className="text-sm text-muted-foreground mt-1">Current status: {enabled ? 'Active' : 'Needs confirmation'}</p></div><span className={`rounded-full px-3 py-1 text-sm ${enabled ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'}`}>{enabled ? 'Active' : 'Attention needed'}</span></div><div className="flex flex-wrap items-end gap-4 mt-6"><div><label htmlFor="threshold" className="block text-sm font-medium text-foreground mb-2">Inactive for (days)</label><Input id="threshold" type="number" min="7" max="365" value={days} onChange={(e) => setDays(e.target.value)} className="w-40" /></div><Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button></div></Card><Card className="p-6"><div className="flex items-center gap-3"><Clock className="w-5 h-5 text-primary" /><div><h2 className="text-xl font-bold text-foreground">Safety status</h2><p className="text-sm text-muted-foreground mt-1">Last confirmation: {lastActive ? new Date(lastActive).toLocaleString('en-IN') : 'Not confirmed yet'}</p></div></div><Button onClick={confirmActive} disabled={saving} className="mt-5 gap-2"><CheckCircle2 className="w-4 h-4" />{saving ? 'Updating...' : "I'm Active Now"}</Button></Card></>}</div></main><button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden fixed bottom-6 right-6 z-30 p-3 bg-primary text-white rounded-full" aria-label="Toggle navigation"><Menu className="w-6 h-6" /></button></div>;
}
