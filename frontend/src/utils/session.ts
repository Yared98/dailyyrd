export function getSessionHash(): string {
  const KEY = 'dailyyrd_session_hash';
  let hash = localStorage.getItem(KEY);
  if (!hash) {
    // crypto.randomUUID() para entropia criptográfica adequada
    hash = 'usr_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    localStorage.setItem(KEY, hash);
  }
  return hash;
}

export interface UserProfile {
  name: string;
  role: string;
  avatarColor: string;
}

export function getSavedUserProfile(): UserProfile {
  let name = '';
  try {
    name = localStorage.getItem('yrd_profile_name') || localStorage.getItem('dailyyrd_user_name') || '';
  } catch {}
  return {
    name,
    role: localStorage.getItem('dailyyrd_user_role') || '',
    avatarColor: localStorage.getItem('dailyyrd_user_color') || '#6366F1',
  };
}

export function saveUserProfile(profile: Partial<UserProfile>): void {
  try {
    if (profile.name !== undefined) {
      const clean = profile.name.trim();
      localStorage.setItem('dailyyrd_user_name', clean);
      if (clean) {
        localStorage.setItem('yrd_profile_name', clean);
      }
    }
    if (profile.role !== undefined) localStorage.setItem('dailyyrd_user_role', profile.role);
    if (profile.avatarColor !== undefined) localStorage.setItem('dailyyrd_user_color', profile.avatarColor);
  } catch {}
}

export function getFacilitatorToken(boardId: string): string | null {
  return localStorage.getItem(`dailyyrd_fac_${boardId}`);
}

export function saveFacilitatorToken(boardId: string, token: string): void {
  localStorage.setItem(`dailyyrd_fac_${boardId}`, token);
}

export interface RecentBoard {
  id: string;
  title: string;
  visitedAt: number;
  role?: 'facilitator' | 'member';
  facilitatorToken?: string | null;
}

export function getRecentBoards(): RecentBoard[] {
  try {
    const raw = localStorage.getItem('dailyyrd_recent_boards');
    if (!raw) return [];
    const list: RecentBoard[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    return list.map((b) => {
      const facToken = b.facilitatorToken || getFacilitatorToken(b.id);
      return {
        ...b,
        facilitatorToken: facToken,
        role: b.role || (facToken ? 'facilitator' : 'member'),
      };
    });
  } catch {
    return [];
  }
}

export function addRecentBoard(board: {
  id: string;
  title: string;
  role?: 'facilitator' | 'member';
  facilitatorToken?: string | null;
}): void {
  try {
    const facToken = board.facilitatorToken || getFacilitatorToken(board.id);
    const role = board.role || (facToken ? 'facilitator' : 'member');
    const list = getRecentBoards().filter((b) => b.id !== board.id);
    list.unshift({
      id: board.id,
      title: board.title,
      visitedAt: Date.now(),
      role,
      facilitatorToken: facToken,
    });
    localStorage.setItem('dailyyrd_recent_boards', JSON.stringify(list.slice(0, 15)));
  } catch {}
}

export function removeRecentBoard(boardId: string): RecentBoard[] {
  try {
    const list = getRecentBoards().filter((b) => b.id !== boardId);
    localStorage.setItem('dailyyrd_recent_boards', JSON.stringify(list));
    return list;
  } catch {
    return [];
  }
}

