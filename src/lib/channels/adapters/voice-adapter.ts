/**
 * Voice channel adapter — types only (no implementation).
 * Foundation for future Twilio Voice / WebRTC integration.
 */

import type { ChannelTypeName } from "../types";

export type CallState = "RINGING" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "FAILED" | "NO_ANSWER" | "BUSY";

export const CALL_STATE_TRANSITIONS: Record<CallState, CallState[]> = {
  RINGING: ["IN_PROGRESS", "NO_ANSWER", "BUSY", "FAILED"],
  IN_PROGRESS: ["ON_HOLD", "COMPLETED", "FAILED"],
  ON_HOLD: ["IN_PROGRESS", "COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
  NO_ANSWER: [],
  BUSY: [],
};

export type VoicePipelineConfig = {
  sttProvider: "twilio" | "deepgram" | "google";
  ttsProvider: "twilio" | "elevenlabs" | "google";
  language: string;
  voiceId: string;
  interruptible: boolean;
  silenceTimeoutMs: number;
};

export type SttResult = {
  text: string;
  confidence: number;
  language: string;
  durationMs: number;
};

export type TtsResult = {
  audioUrl: string;
  durationMs: number;
};

export type TwilioVoiceWebhookPayload = {
  CallSid: string;
  CallStatus: string;
  From: string;
  To: string;
  Direction: string;
  SpeechResult?: string;
  Confidence?: string;
};

export interface VoiceChannelAdapter {
  channelType: ChannelTypeName;
  initiateCall(userId: string, toNumber: string, config: VoicePipelineConfig): Promise<{ callSid: string }>;
  endCall(callSid: string): Promise<void>;
  getCallState(callSid: string): Promise<CallState>;
}
