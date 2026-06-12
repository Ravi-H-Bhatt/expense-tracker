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
  const fromProfile = (profile?.full_name || user?.profile?.full_name || '').trim();
  if (fromProfile) return fromProfile;

  const meta = user?.user_metadata || {};
  const fromMeta = (meta.full_name || meta.name || meta.display_name || '').trim();
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
