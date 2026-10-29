import { Link } from 'react-router';
import { Mascot } from '../../components/Mascot';
import { EmptyState } from '../../components/ui';
import { useDocumentTitle } from '../../hooks/media';

export default function NotFound() {
  useDocumentTitle('Halaman tidak ditemui');
  return (
    <EmptyState art={<Mascot mood="think" className="size-28" />} title="Halaman ini tidak ditemui" action={<Link to="/" className="btn btn-primary">Ke laman utama</Link>}>
      Bayu pun sesat! Pautan ini mungkin salah atau sudah tidak digunakan.
    </EmptyState>
  );
}
