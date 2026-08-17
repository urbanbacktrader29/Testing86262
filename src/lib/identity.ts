interface StoredIdentity {
  playerId: string;
  nickname: string;
}

const key = (code: string) => `doodle-party:${code.toUpperCase()}`;

export function loadIdentity(code: string): StoredIdentity | null {
  try {
    const raw = localStorage.getItem(key(code));
    return raw ? (JSON.parse(raw) as StoredIdentity) : null;
  } catch {
    return null;
  }
}

export function saveIdentity(code: string, identity: StoredIdentity) {
  localStorage.setItem(key(code), JSON.stringify(identity));
}

export function clearIdentity(code: string) {
  localStorage.removeItem(key(code));
}

export function loadLastNickname(): string {
  return localStorage.getItem("doodle-party:nickname") ?? "";
}

export function saveLastNickname(nickname: string) {
  localStorage.setItem("doodle-party:nickname", nickname);
}
