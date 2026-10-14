'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Filter, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { Logo } from '@/components/logo';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface ActivityLog { id: string; action: string; description: string | null; action_timestamp: string | null; created_at: string; }

const typeFor = (action: string) => action.includes('login') ? 'login' : action.includes('inactivity') || action.includes('active') ? 'inactivity' : action.includes('access') || action.includes('asset') ? 'access' : action.includes('alert') || action.includes('contact') ? 'alert' : 'system';

export default function ActivityLogsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filter, setFilter] = useState('all');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push('/'); return; }
      const { data, error } = await supabase.from('activity_logs').select('id, action, description, action_timestamp, created_at').eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(200);
      if (!mounted) return;
      if (error) toast.error('Failed to load activity logs'); else setLogs(data ?? []);
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [router]);

  const visible = useMemo(() => filter === 'all' ? logs : logs.filter((log) => typeFor(log.action) === filter), [filter, logs]);
  const exportLogs = () => {
    const csv = ['timestamp,action,description', ...logs.map((log) => `${JSON.stringify(log.action_timestamp ?? log.created_at)},${JSON.stringify(log.action)},${JSON.stringify(log.description ?? '')}`)].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a'); link.href = url; link.download = 'nidhi-rakshak-activity-log.csv'; link.click(); URL.revokeObjectURL(url);
  };

  return <div className="min-h-screen bg-background"><DashboardSidebar isOpen={sidebarOpen} currentPage="activity-logs" /><main className={`${sidebarOpen ? 'ml-64' : 'ml-0'} transition-all duration-300`}><header className="bg-primary text-white p-6 shadow-lg"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/20 rounded-lg" aria-label="Toggle navigation"><Menu className="w-6 h-6" /></button><div><h1 className="text-2xl font-bold">Activity Logs & Audit Trail</h1><p className="text-white/80 text-sm mt-1">A live record of actions on your account</p></div></div><Logo size="sm" /></div></header><div className="p-8 max-w-6xl mx-auto space-y-6"><Card className="p-5 bg-primary/5 border-primary/20"><p className="text-sm text-muted-foreground">These entries are loaded from your account&apos;s activity log and are scoped by Supabase row-level security.</p></Card><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{['all', 'login', 'inactivity', 'alert', 'access', 'system'].map((item) => <Button key={item} variant={filter === item ? 'default' : 'outline'} onClick={() => setFilter(item)} className="gap-2">{item === 'all' && <Filter className="w-4 h-4" />}{item[0].toUpperCase() + item.slice(1)}</Button>)}</div><Button variant="outline" onClick={exportLogs} className="gap-2"><Download className="w-4 h-4" />Export Audit Trail</Button></div>{loading ? <Card className="p-8 text-center text-muted-foreground">Loading activity...</Card> : visible.length === 0 ? <Card className="p-8 text-center text-muted-foreground">No activity recorded for this filter.</Card> : <div className="space-y-3">{visible.map((log, index) => <Card key={log.id} className={`p-5 border-l-4 ${index === 0 ? 'border-l-primary' : 'border-l-primary/20'}`}><div className="flex items-start justify-between gap-4"><div><h2 className="font-bold text-foreground">{log.action.replaceAll('_', ' ')}</h2><p className="text-sm text-muted-foreground mt-1">{log.description || 'No additional details'}</p><p className="text-xs text-muted-foreground mt-3">{new Date(log.action_timestamp ?? log.created_at).toLocaleString('en-IN')}</p></div>{index === 0 && <span className="text-xs font-semibold text-accent">LATEST</span>}</div></Card>)}</div>}<div className="grid sm:grid-cols-3 gap-4"><Card className="p-4 text-center"><p className="text-2xl font-bold text-primary">{logs.length}</p><p className="text-sm text-muted-foreground">Total Events</p></Card><Card className="p-4 text-center"><p className="text-2xl font-bold text-accent">{logs.filter((l) => typeFor(l.action) === 'access').length}</p><p className="text-sm text-muted-foreground">Access Events</p></Card><Card className="p-4 text-center"><p className="text-2xl font-bold text-secondary">{logs.filter((l) => typeFor(l.action) === 'inactivity').length}</p><p className="text-sm text-muted-foreground">Safety Events</p></Card></div></div></main><button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden fixed bottom-6 right-6 z-30 p-3 bg-primary text-white rounded-full" aria-label="Toggle navigation"><Menu className="w-6 h-6" /></button></div>;
}
