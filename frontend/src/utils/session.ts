export function getSessionHash(): string {
  const KEY = 'dailyyrd_session_hash';
  let hash = localStorage.getItem(KEY);
  if (!hash) {
    hash = 'usr_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
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
  return {
    name: localStorage.getItem('dailyyrd_user_name') || '',
    role: localStorage.getItem('dailyyrd_user_role') || '',
    avatarColor: localStorage.getItem('dailyyrd_user_color') || '#6366F1',
  };
}

export function saveUserProfile(profile: Partial<UserProfile>): void {
  if (profile.name !== undefined) localStorage.setItem('dailyyrd_user_name', profile.name);
  if (profile.role !== undefined) localStorage.setItem('dailyyrd_user_role', profile.role);
  if (profile.avatarColor !== undefined) localStorage.setItem('dailyyrd_user_color', profile.avatarColor);
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
}

export function getRecentBoards(): RecentBoard[] {
  try {
    const raw = localStorage.getItem('dailyyrd_recent_boards');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentBoard(board: { id: string; title: string }): void {
  try {
    const list = getRecentBoards().filter((b) => b.id !== board.id);
    list.unshift({
      id: board.id,
      title: board.title,
      visitedAt: Date.now(),
    });
    localStorage.setItem('dailyyrd_recent_boards', JSON.stringify(list.slice(0, 10)));
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

