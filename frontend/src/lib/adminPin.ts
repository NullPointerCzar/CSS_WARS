/**
 * Admin PIN management.
 *
 * The admin PIN is stored in sessionStorage (not localStorage) so it:
 * - Lives only for the current browser tab session
 * - Is cleared when the tab is closed
 * - Is not compiled into the JS bundle (no hardcoded value)
 *
 * The admin must enter their PIN when first accessing admin pages.
 */

const ADMIN_PIN_KEY = 'cssbattle_admin_pin';

export function getAdminPin(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_PIN_KEY);
  } catch {
    return null;
  }
}

export function setAdminPin(pin: string): void {
  try {
    sessionStorage.setItem(ADMIN_PIN_KEY, pin);
  } catch {
    // sessionStorage may be unavailable in some environments — fail silently
  }
}

export function clearAdminPin(): void {
  try {
    sessionStorage.removeItem(ADMIN_PIN_KEY);
  } catch {
    // fail silently
  }
}
