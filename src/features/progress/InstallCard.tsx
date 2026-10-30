import { Download } from 'lucide-react';
import { isIos, isStandalone, useInstallPrompt } from '../../hooks/install';

/** Only appears when installing is really possible; iPhones have no prompt, so it explains the steps. */
export function InstallCard() {
  const install = useInstallPrompt();
  if (isStandalone() || (!install && !isIos())) return null;
  return (
    <div className="card mt-3 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" data-testid="pasang">
      <div>
        <p className="font-[800]">Pasang LESTARI pada telefon</p>
        <p className="text-[0.875rem] text-ink-muted">{install ? 'Buka terus dari skrin utama, seperti aplikasi.' : 'Dalam Safari, tekan Kongsi, kemudian Tambah ke Skrin Utama.'}</p>
      </div>
      {install && <button type="button" className="btn btn-primary btn-sm shrink-0" onClick={install}><Download className="size-4" aria-hidden />Pasang</button>}
    </div>
  );
}
