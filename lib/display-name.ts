/**
 * Single source of truth for resolving a user's display name.
 *
 * Priority:
 *  1. profiles.full_name (explicitly set in profile settings)
 *  2. user_metadata.full_name (set at signup, or from Google OAuth)
 *  3. user_metadata.name (Google sometimes uses `name`)
 *  4. email local-part (e.g. "ravibhatt946" from ravibhatt946@gmail.com)
 *  5. "User" as a last resort
 */
export function resolveDisplayName(user: any, profile?: any): string {
  // Treat the literal placeholder "User" (saved by the old signup trigger)
  // as if it were empty, so a real name from another source wins.
  const clean = (v: any): string => {
    const s = String(v ?? '').trim();
    if (!s) return '';
    if (s.toLowerCase() === 'user') return '';
    return s;
  };

  const fromProfile = clean(profile?.full_name) || clean(user?.profile?.full_name);
  if (fromProfile) return fromProfile;

  const meta = user?.user_metadata || {};
  const fromMeta = clean(meta.full_name) || clean(meta.name) || clean(meta.display_name);
  if (fromMeta) return fromMeta;

  const email: string = user?.email || '';
  if (email.includes('@')) {
    const local = email.split('@')[0].trim();
    if (local) return local;
  }

  return 'User';
}

/** Initials (max 2 chars) for an avatar fallback. */
export function getInitials(name: string, email?: string): string {
  const cleaned = (name || '').trim();
  if (cleaned && cleaned !== 'User') {
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const initials = parts.map(p => p[0]).join('').slice(0, 2).toUpperCase();
    if (initials) return initials;
  }
  if (email) return email[0].toUpperCase();
  return 'U';
}
