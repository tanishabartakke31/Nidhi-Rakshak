'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { Logo } from '@/components/logo';
import { AlertCircle, Clock, Menu, Plus, Trash2, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { logActivity } from '@/lib/log-activity';
import { toast } from 'sonner';

interface Nominee {
  id: string;
  nominee_name: string;
  nominee_email: string | null;
  nominee_phone: string | null;
  relationship: string | null;
}

export default function InheritanceRulesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [inactivityDays, setInactivityDays] = useState('90');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push('/'); return; }
      const [{ data: nomineeData, error: nomineeError }, { data: profile, error: profileError }] = await Promise.all([
        supabase.from('nominees').select('id, nominee_name, nominee_email, nominee_phone, relationship').eq('user_id', auth.user.id).order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('inactivity_threshold_days').eq('user_id', auth.user.id).maybeSingle(),
      ]);
      if (!mounted) return;
      if (nomineeError || profileError) toast.error('Failed to load inheritance rules');
      setNominees(nomineeData ?? []);
      if (profile?.inactivity_threshold_days) setInactivityDays(String(profile.inactivity_threshold_days));
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [router]);

  const addNominee = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push('/'); return; }
    const { data, error } = await supabase.from('nominees').insert({
      user_id: auth.user.id, nominee_name: name.trim(), nominee_email: email.trim(), nominee_phone: phone.trim() || null, relationship: relationship.trim() || null,
    }).select('id, nominee_name, nominee_email, nominee_phone, relationship').single();
    if (error || !data) toast.error('Failed to add nominee');
    else { setNominees((current) => [data, ...current]); setName(''); setEmail(''); setPhone(''); setRelationship(''); toast.success('Nominee added'); await logActivity('nominee_added', `Added nominee: ${data.nominee_name}`); }
    setSaving(false);
  };

  const removeNominee = async (nominee: Nominee) => {
    const supabase = createClient();
    const { error } = await supabase.from('nominees').delete().eq('id', nominee.id);
    if (error) { toast.error('Failed to remove nominee'); return; }
    setNominees((current) => current.filter((item) => item.id !== nominee.id));
    toast.success('Nominee removed');
    await logActivity('nominee_removed', `Removed nominee: ${nominee.nominee_name}`);
  };

  const saveDays = async () => {
    const days = Number(inactivityDays);
    if (!Number.isInteger(days) || days < 7 || days > 365) { toast.error('Choose between 7 and 365 days'); return; }
    setSaving(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push('/'); return; }
    const { error } = await supabase.from('user_profiles').upsert({ user_id: auth.user.id, inactivity_threshold_days: days }, { onConflict: 'user_id' });
    if (error) toast.error('Failed to save inheritance rules');
    else { toast.success('Inheritance rules saved'); await logActivity('inheritance_rules_updated', `Set inactivity threshold to ${days} days`); }
    setSaving(false);
  };

  return <div className="min-h-screen bg-background"><DashboardSidebar isOpen={sidebarOpen} currentPage="inheritance-rules" /><main className={`${sidebarOpen ? 'ml-64' : 'ml-0'} transition-all duration-300`}><header className="bg-primary text-white p-6 shadow-lg"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/20 rounded-lg" aria-label="Toggle navigation"><Menu className="w-6 h-6" /></button><div><h1 className="text-2xl font-bold">Inheritance Rules</h1><p className="text-white/80 text-sm mt-1">Configure your inheritance protection</p></div></div><Logo size="sm" /></div></header><div className="p-8 max-w-4xl mx-auto space-y-6"><Card className="p-6 border-primary/20"><div className="flex items-start gap-3"><Clock className="w-5 h-5 text-primary mt-1" /><div className="flex-1"><h2 className="text-xl font-bold text-foreground">Inactivity threshold</h2><p className="text-sm text-muted-foreground mt-1">Emergency verification begins after this many inactive days.</p><div className="flex gap-3 mt-5"><Input type="number" min="7" max="365" value={inactivityDays} onChange={(e) => setInactivityDays(e.target.value)} className="max-w-40" /><Button onClick={saveDays} disabled={saving}>{saving ? 'Saving...' : 'Save Rule'}</Button></div></div></div></Card><Card className="p-6"><div className="flex items-center justify-between mb-5"><div><h2 className="text-xl font-bold text-foreground flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Nominees</h2><p className="text-sm text-muted-foreground mt-1">People who can receive access after verification.</p></div><span className="text-sm text-muted-foreground">{nominees.length} saved</span></div><form onSubmit={addNominee} className="grid md:grid-cols-2 gap-3 mb-6"><Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required /><Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required /><Input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} /><Input placeholder="Relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} /><Button type="submit" disabled={saving} className="md:col-span-2 gap-2"><Plus className="w-4 h-4" />{saving ? 'Adding...' : 'Add Nominee'}</Button></form>{loading ? <p className="text-muted-foreground">Loading nominees...</p> : nominees.length === 0 ? <p className="text-sm text-muted-foreground">No nominees added yet.</p> : <div className="space-y-2">{nominees.map((nominee) => <div key={nominee.id} className="flex items-center justify-between rounded-lg bg-muted p-4"><div><p className="font-medium text-foreground">{nominee.nominee_name}</p><p className="text-sm text-muted-foreground">{nominee.nominee_email}{nominee.relationship ? ` · ${nominee.relationship}` : ''}</p>{nominee.nominee_phone && <p className="text-xs text-muted-foreground mt-1">{nominee.nominee_phone}</p>}</div><button onClick={() => removeNominee(nominee)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg" aria-label={`Remove ${nominee.nominee_name}`}><Trash2 className="w-4 h-4" /></button></div>)}</div>}</Card><Card className="p-5 border-secondary/30 bg-secondary/5"><div className="flex gap-3"><AlertCircle className="w-5 h-5 text-secondary mt-1" /><p className="text-sm text-muted-foreground">You can confirm activity from the dashboard at any time to reset your safety timer.</p></div></Card></div></main><button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden fixed bottom-6 right-6 z-30 p-3 bg-primary text-white rounded-full" aria-label="Toggle navigation"><Menu className="w-6 h-6" /></button></div>;
}

// Keep the client component self-contained so nominee changes remain scoped to the signed-in user through Supabase RLS.
// The page persists both nominee records and the inactivity threshold instead of relying on placeholder state.
