import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// A user's role is fixed at registration (see app/register/page.tsx) and
// stored in public.users.user_type. This page no longer lets a signed-in
// user pick an arbitrary role — it routes them straight to the dashboard
// that matches their real account type.
export default async function SelectUserTypePage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    redirect('/');
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', authData.user.id)
    .single();

  if (userRow?.user_type === 'nominee') {
    redirect('/nominee-dashboard');
  }

  redirect('/dashboard');
}
