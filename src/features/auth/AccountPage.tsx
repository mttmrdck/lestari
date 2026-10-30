import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { KeyRound, LogOut, ShieldCheck, Trash2, Trophy } from 'lucide-react';
import { useAuth } from '../../app/auth';
import { PageSkeleton } from '../../app/Layout';
import { api, ApiError } from '../../lib/api';
import { validPassword } from '../../lib/account';
import { Sheet } from '../../components/ui';
import { useDocumentTitle } from '../../hooks/media';
import { Field, FormError, Spinner } from './AuthShell';
import { RecoveryCode } from './RecoveryCode';
import { Avatar } from '../leaderboard/Avatar';

export default function AccountPage() {
  useDocumentTitle('Akaun');
  const auth = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);

  if (auth.status === 'loading') return <PageSkeleton />;
  if (!auth.user) return <Navigate to="/masuk?ke=/akaun" replace />;
  const { user } = auth;

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!validPassword(next)) { setMessage({ ok: false, text: 'Kata laluan baharu perlu 8 aksara, dengan huruf dan nombor.' }); return; }
    setBusy(true);
    try {
      await api.changePassword({ current, next });
      setCurrent(''); setNext('');
      setMessage({ ok: true, text: 'Kata laluan ditukar. Peranti lain telah dilog keluar.' });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Ada masalah. Cuba lagi.' });
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setLeaving(true);
    await auth.logout();
    navigate('/', { replace: true });
  }

  async function replaceCode() {
    setRecoveryError(null);
    try {
      const r = await api.newRecoveryCode(recoveryPassword);
      setNewCode(r.recoveryCode);
      setRecoveryPassword('');
    } catch (err) {
      setRecoveryError(err instanceof ApiError ? err.message : 'Ada masalah. Cuba lagi.');
    }
  }

  async function remove() {
    setDeleteError(null);
    try {
      await auth.deleteAccount(deletePassword);
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Ada masalah. Cuba lagi.');
    }
  }

  return (
    <div className="max-w-[640px]">
      <header className="flex items-center gap-4">
        <Avatar name={user.displayName} seed={user.id} size="lg" />
        <div className="min-w-0">
          <h1 className="text-[1.875rem] font-[900] leading-tight">{user.displayName}</h1>
          <p className="truncate text-ink-muted">@{user.username} · {user.email}</p>
        </div>
      </header>

      <Link to="/papan-juara" className="card card-link mt-5 flex items-center gap-3 p-4 no-underline">
        <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-lavender text-on-lavender"><Trophy className="size-5" strokeWidth={2.6} aria-hidden /></span>
        <span className="font-[800]">Lihat kedudukan kamu di Papan Juara</span>
      </Link>

      <section aria-labelledby="tukar" className="card mt-5 p-5">
        <h2 id="tukar" className="text-[1.25rem] font-[900]">Tukar kata laluan</h2>
        <form onSubmit={changePassword} className="mt-3 space-y-4">
          {message && (message.ok ? <p role="status" className="rounded-[var(--radius-md)] bg-primary-soft px-3.5 py-2.5 font-[750] text-on-primary-soft">{message.text}</p> : <FormError>{message.text}</FormError>)}
          <Field id="current" label="Kata laluan semasa" icon={KeyRound} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          <Field id="next" label="Kata laluan baharu" icon={KeyRound} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          <button type="submit" disabled={busy || !current || !next} className="btn btn-primary">{busy && <Spinner />}Simpan</button>
        </form>
      </section>

      <div className="card mt-3 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-[800]">Kod pemulihan</p><p className="text-[0.875rem] text-ink-muted">Kod lama tidak boleh dilihat semula. Jika hilang, cipta kod baharu; kod lama terus tidak sah.</p></div>
        <button type="button" className="btn btn-secondary btn-sm shrink-0" onClick={() => { setNewCode(null); setRecoveryOpen(true); }}><ShieldCheck className="size-4" aria-hidden />Kod Baharu</button>
      </div>
      <div className="card mt-3 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-[800]">Log keluar</p><p className="text-[0.875rem] text-ink-muted">Kemajuan kamu disimpan dalam akaun.</p></div>
        <button type="button" disabled={leaving} className="btn btn-secondary btn-sm" onClick={logout}>{leaving ? <Spinner /> : <LogOut className="size-4" aria-hidden />}Log Keluar</button>
      </div>
      <div className="card mt-3 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-[800]">Padam akaun</p><p className="text-[0.875rem] text-ink-muted">Akaun, XP dan kedudukan kamu dipadam untuk selama-lamanya.</p></div>
        <button type="button" className="btn btn-secondary btn-sm text-coral" onClick={() => setConfirmDelete(true)}><Trash2 className="size-4" aria-hidden />Padam Akaun</button>
      </div>

      <Sheet open={recoveryOpen} onClose={() => setRecoveryOpen(false)} title="Kod pemulihan baharu">
        {newCode ? <RecoveryCode code={newCode} onDone={() => setRecoveryOpen(false)} /> : (
          <>
            <p className="text-ink-muted">Masukkan kata laluan untuk mencipta kod baharu.</p>
            <div className="mt-4 space-y-3">
              {recoveryError && <FormError>{recoveryError}</FormError>}
              <Field id="kod-kata-laluan" label="Kata laluan" icon={KeyRound} type="password" autoComplete="current-password" value={recoveryPassword} onChange={(e) => setRecoveryPassword(e.target.value)} />
            </div>
            <button type="button" disabled={!recoveryPassword} className="btn btn-primary mt-5 w-full" onClick={replaceCode}>Cipta Kod</button>
          </>
        )}
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Padam akaun ini?">
        <p className="text-ink-muted">Tindakan ini tidak boleh dibatalkan. Masukkan kata laluan untuk mengesahkan.</p>
        <div className="mt-4 space-y-3">
          {deleteError && <FormError>{deleteError}</FormError>}
          <Field id="padam" label="Kata laluan" icon={KeyRound} type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>Batal</button>
          <button type="button" disabled={!deletePassword} className="btn btn-primary bg-coral hover:!bg-coral" onClick={remove}>Ya, padam</button>
        </div>
      </Sheet>
    </div>
  );
}
