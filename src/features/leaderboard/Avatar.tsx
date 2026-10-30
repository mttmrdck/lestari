import { hashString } from '../../lib/random';

const TONES = ['bg-primary-soft text-on-primary-soft', 'bg-sky-soft text-sky-ink', 'bg-rose-soft text-coral', 'bg-lavender-soft text-lavender-ink', 'bg-sun-soft text-sun-ink'];
const SIZES = { sm: 'size-10 text-[1rem]', md: 'size-14 text-[1.375rem]', lg: 'size-[72px] text-[1.75rem]' };

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** A colour from the name's hash plus initials, so nobody needs to upload a photo. */
export function Avatar({ name, seed, size = 'sm', ring = '' }: { name: string; seed: string; size?: keyof typeof SIZES; ring?: string }) {
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full border-[3px] font-[900] ${SIZES[size]} ${TONES[hashString(seed) % TONES.length]} ${ring || 'border-surface'}`}>
      {initials(name)}
    </span>
  );
}
