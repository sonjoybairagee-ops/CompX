/**
 * Browser Device Fingerprint Utility for CompX SaaS
 * Generates and maintains a highly persistent unique identifier per device/browser.
 * Uses a double-fallback store across localStorage and browser cookies to prevent easy bypassing.
 */

// Generate a high-entropy random UUID-like string
const generateUUID = (): string => {
  return "dev-uid-" + Math.random().toString(36).substr(2, 9) + "-" + Math.random().toString(36).substr(2, 9);
};

// Retrieve a specific cookie by name
const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
};

// Set a persistent cookie (valid for 1 year)
const setCookie = (name: string, value: string): void => {
  if (typeof document === "undefined") return;
  const oneYear = 365 * 24 * 60 * 60; // 1 year in seconds
  document.cookie = `${name}=${value}; Max-Age=${oneYear}; Path=/; SameSite=Lax; Secure`;
};

export const getOrCreateDeviceFingerprint = (): string => {
  if (typeof window === "undefined") return "";

  const storageKey = "compx_device_fingerprint";
  
  // 1. Try to fetch from LocalStorage
  let deviceId = localStorage.getItem(storageKey);

  // 2. Try to fetch from Cookies if LocalStorage was cleared
  if (!deviceId) {
    deviceId = getCookie(storageKey);
  }

  // 3. Generate a brand new one if not found in either
  if (!deviceId) {
    deviceId = generateUUID();
  }

  // 4. Double-write to both stores to synchronize and restore any cleared value
  try {
    localStorage.setItem(storageKey, deviceId);
    setCookie(storageKey, deviceId);
  } catch (err) {
    console.warn("Failed to synchronize device fingerprint:", err);
  }

  return deviceId;
};
