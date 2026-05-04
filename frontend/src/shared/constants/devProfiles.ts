export interface DevProfile {
  id: string;
  firstName: string;
  fullName: string;
  initials: string;
  email: string;
  role: string;
}

export const DEV_PROFILES = {
  dominic: {
    id: "dominic",
    firstName: "Dominic",
    fullName: "Dominic Bechtold",
    initials: "67",
    email: "dominic67@aura.local",
    role: "Product Owner",
  },
  consti: {
    id: "consti",
    firstName: "Constantin",
    fullName: "Constantin Dendtel",
    initials: "CD",
    email: "consti@aura.local",
    role: "Product Owner",
  },
  testuser: {
    id: "testuser",
    firstName: "Test",
    fullName: "Test User",
    initials: "42",
    email: "testuser42@aura.local",
    role: "Product Owner",
  },
} satisfies Record<string, DevProfile>;

// ─── Switch active profile here ──────────────────────────────────────────────
// Change "testuser" to "dominic" or "consti" to switch the active profile.
export const ACTIVE_DEV_PROFILE: DevProfile = DEV_PROFILES.testuser;
