import type { Language } from "../../features/chat/types/chat";

import userProfileData from "./user-profile.json";

export interface UserProfile {
  firstName: string;
  fullName: string;
  initials: string;
  email: string;
  role: Record<Language, string>;
}

export const userProfile = userProfileData as UserProfile;

export const getUserRoleLabel = (language: Language): string => {
  return userProfile.role[language];
};