/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { test, expect } from "vitest";
import { type RTCCallIntent } from "matrix-js-sdk/lib/matrixrtc";

import { calculateInitialMuteState } from "./initialMuteState";

test.each<{
  callIntent: RTCCallIntent;
  isWidgetMode: boolean;
}>([
  { callIntent: "audio", isWidgetMode: false },
  { callIntent: "audio", isWidgetMode: true },
  { callIntent: "video", isWidgetMode: false },
  { callIntent: "video", isWidgetMode: true },
  { callIntent: "unknown", isWidgetMode: false },
  { callIntent: "unknown", isWidgetMode: true },
])(
  "Should disable video by default (startWithCameraMuted not set) (callIntent: $callIntent, isWidgetMode: $isWidgetMode)",
  ({ callIntent, isWidgetMode }) => {
    const { audioEnabled, videoEnabled } = calculateInitialMuteState(
      false,
      callIntent,
      isWidgetMode,
    );
    expect(audioEnabled).toBe(true);
    expect(videoEnabled).toBe(false);
  },
);

test.each<{
  callIntent: RTCCallIntent;
  isWidgetMode: boolean;
}>([
  { callIntent: "audio", isWidgetMode: false },
  { callIntent: "audio", isWidgetMode: true },
  { callIntent: "video", isWidgetMode: false },
  { callIntent: "video", isWidgetMode: true },
  { callIntent: "unknown", isWidgetMode: false },
  { callIntent: "unknown", isWidgetMode: true },
])(
  "Should disable video when startWithCameraMuted is true (callIntent: $callIntent, isWidgetMode: $isWidgetMode)",
  ({ callIntent, isWidgetMode }) => {
    const { audioEnabled, videoEnabled } = calculateInitialMuteState(
      false,
      callIntent,
      isWidgetMode,
      true,
    );
    expect(audioEnabled).toBe(true);
    expect(videoEnabled).toBe(false);
  },
);

test.each<{
  callIntent: RTCCallIntent;
  isWidgetMode: boolean;
}>([
  { callIntent: "audio", isWidgetMode: false },
  { callIntent: "audio", isWidgetMode: true },
  { callIntent: "video", isWidgetMode: false },
  { callIntent: "video", isWidgetMode: true },
  { callIntent: "unknown", isWidgetMode: false },
  { callIntent: "unknown", isWidgetMode: true },
])(
  "Should allow video based on call intent when startWithCameraMuted is false (callIntent: $callIntent, isWidgetMode: $isWidgetMode)",
  ({ callIntent, isWidgetMode }) => {
    const { audioEnabled, videoEnabled } = calculateInitialMuteState(
      false,
      callIntent,
      isWidgetMode,
      false,
    );
    expect(audioEnabled).toBe(true);
    expect(videoEnabled).toBe(callIntent !== "audio");
  },
);

test.each<{
  callIntent: RTCCallIntent;
}>([
  { callIntent: "audio" },
  { callIntent: "video" },
  { callIntent: "unknown" },
])(
  "Should always mute on start if skipping lobby on non widget mode (callIntent: $callIntent)",
  ({ callIntent }) => {
    const { audioEnabled, videoEnabled } = calculateInitialMuteState(
      true,
      callIntent,
      false,
    );
    expect(audioEnabled).toBe(false);
    expect(videoEnabled).toBe(false);
  },
);

test.each<{
  callIntent: RTCCallIntent;
}>([
  { callIntent: "audio" },
  { callIntent: "video" },
  { callIntent: "unknown" },
])(
  "Can start unmuted if skipping lobby on widget mode (callIntent: $callIntent)",
  ({ callIntent }) => {
    const { audioEnabled, videoEnabled } = calculateInitialMuteState(
      true,
      callIntent,
      true,
    );
    expect(audioEnabled).toBe(true);
    expect(videoEnabled).toBe(false);
  },
);

export {};
