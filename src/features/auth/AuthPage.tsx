import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { ArrowRight, AtSign, Check, Circle, KeyRound, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../../app/auth';
import { api, ApiError } from '../../lib/api';
import { passwordRules, validEmail, validName, validPassword, validUsername } from '../../lib/account';
import { useDocumentTitle } from '../../hooks/media';
import { AuthShell, Field, FormError, Spinner, type BayuState } from './AuthShell';
import { RecoveryCode } from './RecoveryCode';

type Mode = 'masuk' | 'daftar';

const SAY: Record<Mode, string> = {
  masuk: 'Selamat kembali! Bayu sudah tunggu kamu.',
  daftar: 'Hai! Jom cipta akaun dan masuk Papan Juara.',
};

/** Only same-site paths, so a crafted link cannot send someone elsewhere after login. */
const safeNext = (v: string | null) => (v && v.startsWith('/') && !v.startsWith('//') ? v : '/');

export default function AuthPage({ mode }: { mode: Mode }) {
  useDocumentTitle(mode === 'masuk' ? 'Log Masuk' : 'Daftar');
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('ke'));

  const [identifier, setIdentifier] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(true);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [focus, setFocus] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<string | null>(null);
  const [nameFree, setNameFree] = useState<boolean | null>(null);
  const passwordField = useRef<HTMLInputElement>(null);
  // Signing in flips auth.status before this page has shown its result, and the recovery code exists
  // only in this response, so the "already signed in" redirect must wait for the form to finish.
  const submitting = useRef(false);
  const [passwordShown, setPasswordShown] = useState(false);

  useEffect(() => { setError(null); setFieldError({}); setSubmitted(false); setTouched({}); }, [mode]);

  // The toggle lives inside Field; the input's type tells Bayu when to peek.
  useEffect(() => {
    const el = passwordField.current;
    if (!el) return;
    const obs = new MutationObserver(() => setPasswordShown(el.type === 'text'));
    obs.observe(el, { attributes: true, attributeFilter: ['type'] });
    return () => obs.disconnect();
  });

  useEffect(() => {
    if (mode !== 'daftar' || !validUsername(username)) { setNameFree(null); return; }
    let stale = false;
    const t = window.setTimeout(() => {
      api.usernameFree(username.trim().toLowerCase()).then((r) => { if (!stale) setNameFree(r.available); }).catch(() => { if (!stale) setNameFree(null); });
    }, 350);
    return () => { stale = true; window.clearTimeout(t); };
  }, [username, mode]);

  const show = (f: string) => submitted || touched[f];
  const blur = (f: string) => { setFocus(null); setTouched((t) => ({ ...t, [f]: true })); };
  const errors: Record<string, string | null> = mode === 'masuk'
    ? { identifier: identifier.trim() ? null : 'Isikan e-mel atau nama pengguna.', password: password ? null : 'Isikan kata laluan.' }
    : {
        displayName: validName(displayName) ? null : 'Nama paparan perlu 2 hingga 24 aksara.',
        username: !validUsername(username) ? 'Guna 3 hingga 20 aksara: huruf kecil, nombor atau garis bawah.' : nameFree === false ? 'Nama pengguna ini sudah digunakan.' : null,
        email: validEmail(email) ? null : 'Masukkan e-mel yang sah, contohnya nama@contoh.my.',
        password: validPassword(password) ? null : 'Kata laluan belum memenuhi syarat di bawah.',
        confirm: confirm && confirm === password ? null : 'Kata laluan tidak sama.',
      };
  const hasErrors = Object.values(errors).some(Boolean);
  const errorFor = (f: string) => fieldError[f] || (show(f) ? errors[f] : null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    setFieldError({});
    if (hasErrors || busy) return;
    setBusy(true);
    submitting.current = true;
    try {
      if (mode === 'masuk') {
        const u = await auth.login({ identifier, password, remember });
        setSuccess(`Selamat kembali, ${u.displayName}!`);
        window.setTimeout(() => navigate(next, { replace: true }), 900);
      } else {
        const r = await auth.register({ displayName, username, email, password, remember });
        setRecovery(r.recoveryCode);
        setSuccess(`Selamat datang, ${r.user.displayName}!`);
      }
    } catch (err) {
      const code = err instanceof ApiError ? err.code : '';
      const message = err instanceof ApiError ? err.message : 'Ada masalah. Cuba lagi.';
      if (code === 'email-taken') setFieldError({ email: message });
      else if (code === 'username-taken') setFieldError({ username: message });
      else setError(message);
      submitting.current = false;
    } finally {
      setBusy(false);
    }
  }

  // Someone already signed in has nothing to do here, unless they are reading their recovery code.
  if (auth.status === 'user' && !submitting.current) return <Navigate to={next} replace />;

  const typingPassword = focus === 'password' || focus === 'confirm';
  const bayu: BayuState = {
    mood: success ? 'cheer' : (error || Object.keys(fieldError).length) ? 'encourage' : busy ? 'think' : 'happy',
    cover: !success && typingPassword ? (passwordShown ? 'peek' : 'full') : 'none',
    look: focus === 'identifier' || focus === 'email' || focus === 'username' || focus === 'displayName'
      ? Math.min(1, ((focus === 'email' ? email : focus === 'username' ? username : focus === 'displayName' ? displayName : identifier).length - 8) / 12) : 0,
    say: success ?? (error ? 'Tak mengapa, jom cuba sekali lagi.' : busy ? 'Sekejap ya…' : typingPassword ? (passwordShown ? 'Bayu intai sikit sahaja!' : 'Bayu tak tengok. Janji!') : SAY[mode]),
  };

  if (recovery) {
    return (
      <AuthShell bayu={{ ...bayu, say: 'Simpan kod ini baik-baik ya!' }}>
        <RecoveryCode code={recovery} onDone={() => navigate(next === '/' ? '/' : next, { replace: true })} />
      </AuthShell>
    );
  }

  return (
    <AuthShell bayu={bayu}>
      <h1 className="text-[2rem] font-[900] leading-tight tracking-[-0.02em]">{mode === 'masuk' ? 'Selamat kembali!' : 'Jom mulakan pengembaraan!'}</h1>
      <p className="mt-1 text-ink-muted">{mode === 'masuk' ? 'Teruskan perjalanan menguasai peribahasa.' : 'Simpan kemajuan kamu dan bersaing di Papan Juara.'}</p>

      <div className="relative mt-5 grid grid-cols-2 rounded-[14px] bg-surface-sunk p-1" role="navigation" aria-label="Pilih log masuk atau daftar">
        <span aria-hidden className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-[10px] bg-surface shadow-[var(--shadow-rest)] transition-transform duration-300 ease-[var(--ease-spring)]" style={{ transform: mode === 'daftar' ? 'translateX(100%)' : 'none' }} />
        {(['masuk', 'daftar'] as const).map((m) => (
          <Link key={m} to={`/${m}${params.toString() ? `?${params}` : ''}`} replace aria-current={m === mode ? 'page' : undefined} className={`relative grid min-h-11 place-items-center rounded-[10px] text-[0.9375rem] font-[800] no-underline transition-colors duration-200 ${m === mode ? 'text-ink' : 'text-ink-muted hover:text-ink'}`}>
            {m === 'masuk' ? 'Log Masuk' : 'Daftar'}
          </Link>
        ))}
      </div>

      <form key={mode} onSubmit={submit} noValidate className="rise-in mt-5 space-y-4">
        {error && <FormError>{error}</FormError>}
        {mode === 'masuk' ? (
          <Field id="identifier" label="E-mel atau nama pengguna" icon={Mail} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="nama@contoh.my" value={identifier} onChange={(e) => setIdentifier(e.target.value)} onFocus={() => setFocus('identifier')} onBlur={() => blur('identifier')} error={errorFor('identifier')} />
        ) : (
          <>
            <Field id="displayName" label="Nama paparan" icon={UserRound} autoComplete="name" maxLength={24} placeholder="Nama yang orang lain nampak" value={displayName} onChange={(e) => setDisplayName(e.target.value)} onFocus={() => setFocus('displayName')} onBlur={() => blur('displayName')} error={errorFor('displayName')} />
            <Field id="username" label="Nama pengguna" icon={AtSign} autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={20} placeholder="contoh: aina_07" value={username} onChange={(e) => { setUsername(e.target.value.toLowerCase()); setFieldError((f) => ({ ...f, username: '' })); }} onFocus={() => setFocus('username')} onBlur={() => blur('username')} error={errorFor('username') || null} good={nameFree && validUsername(username) ? 'Nama pengguna ini tersedia.' : null} />
            <Field id="email" label="E-mel" icon={Mail} type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="nama@contoh.my" value={email} onChange={(e) => { setEmail(e.target.value); setFieldError((f) => ({ ...f, email: '' })); }} onFocus={() => setFocus('email')} onBlur={() => blur('email')} error={errorFor('email') || null} />
          </>
        )}
        <Field
          id="password" label="Kata laluan" icon={KeyRound} type="password"
          autoComplete={mode === 'masuk' ? 'current-password' : 'new-password'}
          placeholder={mode === 'masuk' ? 'Kata laluan kamu' : 'Cipta kata laluan'}
          value={password} onChange={(e) => setPassword(e.target.value)}
          onFocus={(e) => { setFocus('password'); passwordField.current = e.currentTarget; }} onBlur={() => blur('password')}
          error={mode === 'masuk' ? errorFor('password') : show('password') ? errorFor('password') : null}
          hint={mode === 'daftar' && (
            <ul className="mt-2 grid gap-1 sm:grid-cols-3" aria-label="Syarat kata laluan">
              {passwordRules(password).map((r) => (
                <li key={r.label} className={`flex items-center gap-1.5 text-[0.8125rem] font-[700] transition-colors duration-200 ${r.ok ? 'text-primary-ink' : 'text-ink-subtle'}`}>
                  {r.ok ? <Check className="pop size-4 shrink-0" strokeWidth={3} aria-hidden /> : <Circle className="size-4 shrink-0" aria-hidden />}{r.label}
                </li>
              ))}
            </ul>
          )}
        />
        {mode === 'daftar' && (
          <Field id="confirm" label="Sahkan kata laluan" icon={KeyRound} type="password" autoComplete="new-password" placeholder="Taip semula kata laluan" value={confirm} onChange={(e) => setConfirm(e.target.value)} onFocus={() => setFocus('confirm')} onBlur={() => blur('confirm')} error={errorFor('confirm')} good={confirm && confirm === password ? 'Kata laluan sama.' : null} />
        )}
        <div className="flex items-center justify-between gap-3">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[0.9375rem] font-[700]">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-5 accent-[var(--color-primary-ink)]" />Ingat saya
          </label>
          {mode === 'masuk' && <Link to="/lupa-kata-laluan" className="text-[0.9375rem] font-[800] text-sky-ink">Lupa kata laluan?</Link>}
        </div>
        <button type="submit" disabled={busy || !!success} className="btn btn-primary min-h-[54px] w-full text-[1.0625rem]">
          {busy ? <><Spinner />{mode === 'masuk' ? 'Sedang masuk…' : 'Mencipta akaun…'}</> : success ? <><Check className="pop size-5" strokeWidth={3} aria-hidden />Berjaya!</> : <>{mode === 'masuk' ? 'Jom Masuk' : 'Cipta Akaun'}<ArrowRight className="size-5" aria-hidden /></>}
        </button>
        <p className="text-center text-[0.9375rem] font-[650] text-ink-muted">
          <Link to="/" className="font-[800] text-primary-ink">Teruskan tanpa akaun</Link>
          <span className="block text-[0.8125rem] font-[600] text-ink-subtle">Kemajuan disimpan dalam pelayar ini sahaja, dan tidak masuk Papan Juara.</span>
        </p>
      </form>
    </AuthShell>
  );
}
