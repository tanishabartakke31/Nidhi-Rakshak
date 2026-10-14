import { createClient } from '@/lib/supabase/client';

/**
 * Records an entry in `activity_logs` for the current user. Safe to call
 * fire-and-forget from client components — logging failures are swallowed
 * (and reported to the console) so they never block the primary action.
 */
export async function logActivity(action: string, description?: string) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from('activity_logs').insert({
      user_id: user.id,
      action,
      description: description ?? null,
      device_info:
        typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });

    if (error) {
      console.error('[v0] Failed to log activity:', error.message);
    }
  } catch (err) {
    console.error('[v0] Failed to log activity:', err);
  }
}
