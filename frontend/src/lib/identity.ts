import { useEffect, useState } from 'react';

const IDENTITY_KEY = 'cssbattle_identity';

export interface UserIdentity {
  id: string;
  name: string;
  role: 'PARTICIPANT' | 'ADMIN';
}

export function getIdentity(): UserIdentity | null {
  try {
    const item = localStorage.getItem(IDENTITY_KEY);
    if (!item) return null;
    return JSON.parse(item) as UserIdentity;
  } catch {
    return null;
  }
}

export function setIdentity(identity: UserIdentity): void {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  // Dispatch a custom event so other components can listen
  window.dispatchEvent(new Event('identityChange'));
}

export function clearIdentity(): void {
  localStorage.removeItem(IDENTITY_KEY);
  window.dispatchEvent(new Event('identityChange'));
}

export function useIdentity() {
  const [identity, setIdentityState] = useState<UserIdentity | null>(getIdentity());

  useEffect(() => {
    const handleIdentityChange = () => {
      setIdentityState(getIdentity());
    };
    window.addEventListener('identityChange', handleIdentityChange);
    return () => window.removeEventListener('identityChange', handleIdentityChange);
  }, []);

  return identity;
}
