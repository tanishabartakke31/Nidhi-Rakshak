'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff, Lock, Plus, ShieldCheck, Trash2, Pencil, Copy, Download, X, Check, KeyRound } from 'lucide-react'
import { Logo } from '@/components/logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { deriveKey, decryptField, encryptField, generateRecoveryCodes } from '@/lib/crypto'

type EntryType = 'Bank' | 'Investment' | 'Insurance' | 'Other'

type VaultEntry = {
  id: number
  name: string
  type: EntryType
  accountNumber: string
  balance: string
  notes: string
}

const initialEntries: VaultEntry[] = [
  { id: 1, name: 'HDFC Savings', type: 'Bank', accountNumber: 'HDFC-4582-9012', balance: '₹2,45,000', notes: 'Primary savings account' },
  { id: 2, name: 'Zerodha Portfolio', type: 'Investment', accountNumber: 'ZRDH-7421-8830', balance: '₹8,20,500', notes: 'Long-term investments' },
  { id: 3, name: 'LIC Life Cover', type: 'Insurance', accountNumber: 'LIC-2098-4431', balance: '₹50,00,000 cover', notes: 'Policy renewed annually' },
  { id: 4, name: 'SBI Fixed Deposit', type: 'Bank', accountNumber: 'SBI-FD-6610-2498', balance: '₹3,00,000', notes: 'Matures in 2027' },
  { id: 5, name: 'Digital Wallet', type: 'Other', accountNumber: 'WALLET-9034-1172', balance: '₹18,450', notes: '' },
]

const typeStyles: Record<EntryType, string> = {
  Bank: 'border-primary/20 bg-primary/5 text-primary',
  Investment: 'border-accent/30 bg-accent/10 text-accent-foreground',
  Insurance: 'border-secondary/30 bg-secondary/10 text-secondary-foreground',
  Other: 'border-border bg-muted text-muted-foreground',
}

function PasswordStrength({ password }: { password: string }) {
  const score = useMemo(() => {
    let value = 0
    if (password.length >= 8) value += 25
    if (/[A-Z]/.test(password)) value += 25
    if (/[0-9]/.test(password)) value += 25
    if (/[^A-Za-z0-9]/.test(password)) value += 25
    return value
  }, [password])
  const label = score < 50 ? 'Needs improvement' : score < 100 ? 'Good strength' : 'Strong password'
  return <div className="flex flex-col gap-2"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Password strength</span><span className="font-medium text-foreground">{password ? label : 'Not set'}</span></div><Progress value={score} aria-label="Password strength" /></div>
}

export default function AssetsPage() {
  const [locked, setLocked] = useState(true)
  const [hasVault, setHasVault] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [showUnlock, setShowUnlock] = useState(false)
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [entries, setEntries] = useState<VaultEntry[]>(initialEntries)
  const [visible, setVisible] = useState<number[]>([])
  const [revealedValues, setRevealedValues] = useState<Record<number, string>>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [unlockPassword, setUnlockPassword] = useState('')
  const [form, setForm] = useState({ name: '', type: 'Bank' as EntryType, accountNumber: '', balance: '', notes: '' })
  const [recoverySaved, setRecoverySaved] = useState(false)
  const [error, setError] = useState('')
  const [currentKey, setCurrentKey] = useState<CryptoKey | null>(null)
  const recoveryCodes = useMemo(() => generateRecoveryCodes(), [])

  const resetForm = () => { setForm({ name: '', type: 'Bank', accountNumber: '', balance: '', notes: '' }); setEditingId(null); setShowEntryForm(false); setError('') }

  const createVault = async () => {
    if (password.length < 8) return setError('Use at least 8 characters for your master password.')
    if (password !== confirmPassword) return setError('Passwords do not match.')
    // TODO: real crypto — this stub intentionally does not encrypt yet.
    const key = await deriveKey(password)
    setCurrentKey(key)
    setHasVault(true)
    setLocked(false)
    setShowRecovery(true)
    setError('')
  }

  const unlockVault = async () => {
    if (!unlockPassword) return setError('Enter your master password.')
    // TODO: real crypto — validate against a real derived key when crypto is implemented.
    const key = await deriveKey(unlockPassword)
    setCurrentKey(key)
    setLocked(false)
    setShowUnlock(false)
    setUnlockPassword('')
    setError('')
  }

  const saveEntry = async () => {
    if (!form.name || !form.accountNumber || !form.balance) return setError('Complete the name, account number, and balance fields.')
    // TODO: real crypto — encrypt sensitive fields before persistence.
    const encryptedAccountNumber = await encryptField(form.accountNumber, currentKey)
    const nextEntry = { ...form, accountNumber: encryptedAccountNumber }
    if (editingId) setEntries((current) => current.map((entry) => entry.id === editingId ? { ...entry, ...nextEntry } : entry))
    else setEntries((current) => [...current, { id: Date.now(), ...nextEntry }])
    resetForm()
  }

  const revealEntry = async (entry: VaultEntry) => {
    if (visible.includes(entry.id)) {
      setVisible((current) => current.filter((id) => id !== entry.id))
      return
    }

    const decrypted = await decryptField(entry.accountNumber, currentKey)
    setRevealedValues((current) => ({ ...current, [entry.id]: decrypted || entry.accountNumber }))
    setVisible((current) => [...current, entry.id])
  }

  const editEntry = (entry: VaultEntry) => { setEditingId(entry.id); setForm({ name: entry.name, type: entry.type, accountNumber: entry.accountNumber, balance: entry.balance, notes: entry.notes }); setShowEntryForm(true) }
  const copyCodes = async () => { await navigator.clipboard.writeText(recoveryCodes.join('\n')) }
  const downloadCodes = () => { const blob = new Blob([recoveryCodes.join('\n')], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'nidhi-rakshak-recovery-codes.txt'; link.click(); URL.revokeObjectURL(url) }

  const router = useRouter()

  if (!hasVault) return <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6"><div className="mx-auto flex max-w-xl flex-col gap-8"><header className="flex items-center justify-between"><Button variant="ghost" onClick={() => router.back()}><ArrowLeft data-icon="inline-start" />Back</Button><Logo size="sm" /></header><div className="flex items-center gap-3"><Logo size="xs" /><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Nidhi Rakshak</p><p className="text-sm text-muted-foreground">Private digital inheritance vault</p></div></div><Card><CardHeader><div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><KeyRound /></div><CardTitle className="text-2xl">Create your master password</CardTitle><CardDescription>This is the only key to your private vault.</CardDescription></CardHeader><CardContent className="flex flex-col gap-5"><div className="flex flex-col gap-2"><Label htmlFor="master-password">Master password</Label><Input id="master-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></div><div className="flex flex-col gap-2"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div><PasswordStrength password={password} /><p className="rounded-lg border border-secondary/30 bg-secondary/10 p-3 text-sm leading-6 text-foreground">This password cannot be recovered. If you forget it, your vault data is permanently lost.</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</CardContent><CardFooter><Button onClick={createVault} className="w-full">Create Vault</Button></CardFooter></Card></div></main>

  return <main className="min-h-screen bg-background text-foreground"><header className="bg-primary p-6 text-white shadow-lg"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4"><div className="flex items-center gap-4"><Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white" onClick={() => router.back()}><ArrowLeft data-icon="inline-start" />Back</Button><div><h1 className="text-2xl font-bold">Encrypted asset vault</h1><p className="mt-1 text-sm text-white/80">Manage your protected assets</p></div></div><Logo size="sm" /></div></header><div className="mx-auto flex max-w-6xl flex-col gap-8 p-8"><div className="flex items-center justify-between gap-4 border-b border-border pb-6"><div><p className="text-sm font-medium text-primary">Nidhi Rakshak</p><h2 className="text-3xl font-semibold tracking-tight">Private asset vault</h2></div><Button variant="outline" onClick={() => { setLocked(true); setShowUnlock(true); setCurrentKey(null) }}><Lock data-icon="inline-start" />Lock Vault</Button></div>{locked ? <Card className="mx-auto w-full max-w-xl"><CardHeader><CardTitle>Vault locked</CardTitle><CardDescription>Unlock your vault to view your protected entries.</CardDescription></CardHeader><CardContent><Button onClick={() => setShowUnlock(true)} className="w-full">Unlock Vault</Button></CardContent></Card> : <><section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-primary">Private workspace</p><h2 className="text-3xl font-semibold tracking-tight">Your accounts</h2><p className="mt-1 text-muted-foreground">Keep important financial details in one calm, protected place.</p></div><Button className="bg-gradient-to-r from-secondary to-primary text-white hover:shadow-lg" onClick={() => setShowEntryForm(true)}><Plus data-icon="inline-start" />Add New Entry</Button></section><section className="grid gap-4 md:grid-cols-2">{entries.map((entry) => <Card key={entry.id}><CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle className="text-lg">{entry.name}</CardTitle><Badge variant="outline" className={`mt-2 ${typeStyles[entry.type]}`}>{entry.type}</Badge></div><div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => editEntry(entry)} aria-label={`Edit ${entry.name}`}><Pencil /></Button><Button variant="ghost" size="icon" onClick={() => setEntries((current) => current.filter((item) => item.id !== entry.id))} aria-label={`Delete ${entry.name}`}><Trash2 /></Button></div></CardHeader><CardContent className="flex flex-col gap-3"><div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2"><span className="font-mono text-sm tracking-widest" aria-label={visible.includes(entry.id) ? 'Sensitive value revealed' : 'Sensitive value hidden'}>{visible.includes(entry.id) ? (revealedValues[entry.id] || entry.accountNumber) : '••••••••••••'}</span><Button type="button" variant="ghost" size="icon" onClick={() => void revealEntry(entry)} aria-label={visible.includes(entry.id) ? `Hide ${entry.name}` : `Show ${entry.name}`} title={visible.includes(entry.id) ? 'Hide sensitive value' : 'Show sensitive value'}>{visible.includes(entry.id) ? <EyeOff /> : <Eye />}</Button></div><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Current value</span><span className="font-semibold">{entry.balance}</span></div>{entry.notes && <p className="text-sm leading-6 text-muted-foreground">{entry.notes}</p>}</CardContent></Card>)}</section></>}</div>{showUnlock && <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"><Card className="w-full max-w-md"><CardHeader className="flex flex-row items-start justify-between"><div><CardTitle>Unlock vault</CardTitle><CardDescription>Enter your master password to continue.</CardDescription></div><Button variant="ghost" size="icon" onClick={() => setShowUnlock(false)} aria-label="Close"><X /></Button></CardHeader><CardContent className="flex flex-col gap-4"><Input autoFocus type="password" value={unlockPassword} onChange={(event) => setUnlockPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') unlockVault() }} placeholder="Master password" />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button onClick={unlockVault}>Unlock</Button></CardContent></Card></div>}{showEntryForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"><Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto"><CardHeader className="flex flex-row items-start justify-between"><div><CardTitle>{editingId ? 'Edit entry' : 'Add new entry'}</CardTitle><CardDescription>Only you should be able to identify this account.</CardDescription></div><Button variant="ghost" size="icon" onClick={resetForm} aria-label="Close"><X /></Button></CardHeader><CardContent className="flex flex-col gap-4"><div className="flex flex-col gap-2"><Label htmlFor="entry-name">Entry name</Label><Input id="entry-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. HDFC Savings" /></div><div className="flex flex-col gap-2"><Label htmlFor="entry-type">Type</Label><select id="entry-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as EntryType })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option>Bank</option><option>Investment</option><option>Insurance</option><option>Other</option></select></div><div className="flex flex-col gap-2"><Label htmlFor="account-number">Account number</Label><Input id="account-number" value={form.accountNumber} onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} /></div><div className="flex flex-col gap-2"><Label htmlFor="current-balance">Current balance</Label><Input id="current-balance" value={form.balance} onChange={(event) => setForm({ ...form, balance: event.target.value })} placeholder="₹0" /></div><div className="flex flex-col gap-2"><Label htmlFor="entry-notes">Notes</Label><Textarea id="entry-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</CardContent><CardFooter className="flex gap-3"><Button variant="outline" className="flex-1" onClick={resetForm}>Cancel</Button><Button className="flex-1" onClick={saveEntry}>Save Entry</Button></CardFooter></Card></div>}{showRecovery && <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"><Card className="w-full max-w-lg"><CardHeader><CardTitle>Your recovery codes</CardTitle><CardDescription>Save these codes somewhere secure. They are shown only once.</CardDescription></CardHeader><CardContent className="flex flex-col gap-5"><div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-4 font-mono text-sm sm:grid-cols-3">{recoveryCodes.map((code, index) => <span key={index}>{code}</span>)}</div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={copyCodes}><Copy data-icon="inline-start" />Copy All</Button><Button variant="outline" onClick={downloadCodes}><Download data-icon="inline-start" />Download .txt</Button></div><label className="flex items-start gap-3 text-sm leading-6"><Checkbox checked={recoverySaved} onCheckedChange={(checked) => setRecoverySaved(checked === true)} /><span>I have saved these codes in a safe place</span></label></CardContent><CardFooter><Button className="w-full" disabled={!recoverySaved} onClick={() => setShowRecovery(false)}><Check data-icon="inline-start" />Continue</Button></CardFooter></Card></div>}</main>
}
