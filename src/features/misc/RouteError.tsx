import { useRouteError } from 'react-router';
import { Mascot } from '../../components/Mascot';

/** Last-resort boundary: keeps the app usable if a screen throws. */
export function RouteError() {
  const error = useRouteError();
  console.error(error);
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-4 px-6 text-center">
      <Mascot mood="think" className="size-28" />
      <h1 className="text-[1.5rem] font-[740]">Ada sesuatu yang tidak kena</h1>
      <p className="text-ink-muted">Halaman ini gagal dipaparkan. Kemajuan kamu masih selamat. Cuba muat semula, atau kembali ke laman utama.</p>
      <div className="flex gap-3">
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Muat semula</button>
        <a href="/" className="btn btn-secondary">Laman utama</a>
      </div>
    </div>
  );
}
