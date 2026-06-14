import raw from "../../../../config/frontend.yaml";

interface SpeechConfig {
  monitor_poll_ms: number;
  rms_threshold: number;
  min_segment_ms: number;
  silence_flush_ms: number;
  max_segment_ms: number;
  transcript_animation_step_ms: number;
}

interface AuthUiConfig {
  max_error_message_length: number;
}

interface FeatureFlags {
  enable_instafeed: boolean;
  enable_header_story_strip: boolean;
  enable_workspace_newsfeed: boolean;
}

interface FrontendConfig {
  speech: SpeechConfig;
  auth: AuthUiConfig;
  feature_flags: FeatureFlags;
}

const _cfg = raw as unknown as FrontendConfig;

export const speechCfg = _cfg.speech;
export const authUiCfg = _cfg.auth;
export const featureFlags = _cfg.feature_flags;
