'use client';

import type React from 'react';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const [step, setStep] = useState<'email' | 'details'>('email');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState<'account_holder' | 'nominee'>('account_holder');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleProceedToDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Email is required');
      return;
    }

    setStep('details');
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone_number: phone || null,
            role,
          },
        },
      });

      if (signUpError) {
        if (signUpError.code === 'user_already_exists') {
          setError('An account with this email already exists. Please log in instead.');
          setTimeout(() => router.push('/'), 2000);
        } else if (signUpError.code === 'weak_password') {
          setError('Password is too weak. Please choose a stronger password.');
        } else {
          setError('Failed to create account. Please try again.');
        }
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error('[v0] Registration error:', err);
      setError('Failed to create account. Please try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-primary/80 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <div className="p-8 text-center">
            <h1 className="text-2xl font-bold text-primary mb-3">Check your email</h1>
            <p className="text-muted-foreground mb-6">
              We&apos;ve sent a confirmation link to <span className="font-medium text-foreground">{email}</span>.
              Click it to activate your account, then log in.
            </p>
            <Link href="/">
              <Button className="w-full h-12 bg-gradient-to-r from-secondary to-primary text-white font-medium">
                Back to Login
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-primary/80 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              type="button"
              onClick={() => (step === 'details' ? setStep('email') : router.push('/'))}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-primary">Create Account</h1>
              <p className="text-xs text-muted-foreground">
                Step {step === 'email' ? '1' : '2'} of 2
              </p>
            </div>
          </div>

          {/* Step 1: Email + role */}
          {step === 'email' && (
            <form onSubmit={handleProceedToDetails} className="space-y-4">
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
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  First Name
                </label>
                <Input
                  type="text"
                  placeholder="Enter your first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                  className="bg-muted border-input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Last Name
                </label>
                <Input
                  type="text"
                  placeholder="Enter your last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                  className="bg-muted border-input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Mobile Number (Optional)
                </label>
                <Input
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  className="bg-muted border-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  I am registering as
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('account_holder')}
                    className={`h-11 rounded-md border text-sm font-medium transition-colors ${
                      role === 'account_holder'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input text-muted-foreground'
                    }`}
                  >
                    Account Holder
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('nominee')}
                    className={`h-11 rounded-md border text-sm font-medium transition-colors ${
                      role === 'nominee'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input text-muted-foreground'
                    }`}
                  >
                    Nominee
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-secondary to-primary text-white font-medium"
              >
                Next
              </Button>
            </form>
          )}

          {/* Step 2: Password */}
          {step === 'details' && (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="bg-muted border-input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="bg-muted border-input"
                  required
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
                className="w-full h-12 bg-gradient-to-r from-secondary to-primary text-white font-medium"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setError('');
                }}
                className="w-full text-sm text-primary hover:underline"
              >
                Back to email
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/" className="text-primary hover:underline font-medium">
              Login
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
