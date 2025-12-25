// src/lib/auth/constants.ts
export const LIFEe_SESSION_COOKIE = "lifee_session";
export const LIFEe_DEMO_COOKIE = "lifee_demo";

export const SESSION_TTL_DAYS = 30;
export const AUTH_CODE_TTL_MIN = 10;

export const DEMO_START_CREDITS = 2;

// emails guests
export const GUEST_EMAIL_DOMAIN = "lifee.invalid";

export function makeGuestEmail(id: string) {
    return `guest_${id}@${GUEST_EMAIL_DOMAIN}`;
}
