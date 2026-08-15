'use client';

import type React from 'react';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

// Only the credential/existence signal is genericized — naming it would
// confirm whether an email is registered. Errors the user can act on are
// passed through, and anything unexpected is reported as such.
function loginErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: string; status?: number };

  if (code === 'email_not_confirmed') {
    return 'Please confirm your email address — check your inbox for the link.';
  }
  if (code === 'over_request_rate_limit' || status === 429) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (code === 'invalid_credentials') {
    return 'Invalid email or password.';
  }
  return 'Something went wrong. Please try again.';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      router.push('/select-user-type');
      router.refresh();
    } catch (err: unknown) {
      console.error('[v0] Login error:', err);
      setError(loginErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-primary/80 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <div className="p-8">
          {/* Logo Section */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <Image
              src="/nidhi-rakshak-logo.png"
              alt="Nidhi Rakshak Logo"
              width={140}
              height={120}
              className="w-auto h-auto"
              priority
            />
            <div className="text-center">
              <h1 className="text-2xl font-bold text-primary">NIDHI RAKSHAK</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Secure today, safeguard tomorrow
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="bg-muted border-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="bg-muted border-input"
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-secondary to-primary text-white font-medium text-base hover:shadow-lg transition-shadow"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 flex items-center justify-between text-sm">
            <Link
              href="/forgot-password"
              className="text-primary hover:underline font-medium"
            >
              Forgot Password?
            </Link>
            <Link
              href="/register"
              className="text-primary hover:underline font-medium"
            >
              New User? Register
            </Link>
          </div>

          {/* Security Notice */}
          <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
            <p className="mb-2">Government-Certified Security</p>
            <p>Your financial data is protected with industry-leading encryption.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
