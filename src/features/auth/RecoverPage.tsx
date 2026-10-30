import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../app/auth';
import { ApiError } from '../../lib/api';
import { passwordRules, validPassword } from '../../lib/account';
import { useDocumentTitle } from '../../hooks/media';
import { AuthShell, Field, FormError, Spinner } from './AuthShell';
import { RecoveryCode } from './RecoveryCode';

export default function RecoverPage() {
  useDocumentTitle('Lupa Kata Laluan');
  const auth = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCode, setNextCode] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    if (!identifier.trim() || !code.trim() || !validPassword(password) || busy) return;
    setBusy(true);
    try {
      const r = await auth.recover({ identifier, recoveryCode: code, password });
      setNextCode(r.recoveryCode);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ada masalah. Cuba lagi.');
    } finally {
      setBusy(false);
    }
  }

  if (nextCode) {
    return (
      <AuthShell bayu={{ mood: 'cheer', cover: 'none', look: 0, say: 'Akaun kamu selamat semula! Ini kod baharu.' }}>
        <RecoveryCode code={nextCode} onDone={() => navigate('/', { replace: true })} />
      </AuthShell>
    );
  }

  return (
    <AuthShell bayu={{ mood: error ? 'encourage' : 'think', cover: 'none', look: 0, say: 'Jangan risau, kod pemulihan boleh membantu.' }}>
      <Link to="/masuk" className="btn btn-quiet btn-sm -ml-3"><ArrowLeft className="size-4" aria-hidden />Kembali ke Log Masuk</Link>
      <h1 className="mt-2 text-[2rem] font-[900] leading-tight tracking-[-0.02em]">Lupa kata laluan?</h1>
      <p className="mt-1 text-ink-muted">Masukkan kod pemulihan yang kamu simpan semasa mendaftar, kemudian cipta kata laluan baharu.</p>
      <form onSubmit={submit} noValidate className="mt-5 space-y-4">
        {error && <FormError>{error}</FormError>}
        <Field id="identifier" label="E-mel atau nama pengguna" icon={Mail} autoComplete="username" autoCapitalize="none" spellCheck={false} value={identifier} onChange={(e) => setIdentifier(e.target.value)} error={submitted && !identifier.trim() ? 'Isikan e-mel atau nama pengguna.' : null} />
        <Field id="code" label="Kod pemulihan" icon={ShieldCheck} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="XXXX-XXXX-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value)} error={submitted && !code.trim() ? 'Isikan kod pemulihan.' : null} />
        <Field id="password" label="Kata laluan baharu" icon={KeyRound} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={submitted && !validPassword(password) ? passwordRules(password).find((r) => !r.ok)?.label ?? 'Kata laluan tidak sah.' : null} />
        <button type="submit" disabled={busy} className="btn btn-primary min-h-[54px] w-full">{busy ? <><Spinner />Memulihkan…</> : 'Pulihkan Akaun'}</button>
        <p className="text-[0.8125rem] text-ink-subtle">Kod hilang? LESTARI tidak menyimpan kod dalam bentuk boleh dibaca, jadi akaun tidak dapat dipulihkan tanpanya. Kamu boleh mendaftar akaun baharu.</p>
      </form>
    </AuthShell>
  );
}
