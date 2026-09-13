/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { logger } from "matrix-js-sdk/lib/logger";
import { type RTCCallIntent } from "matrix-js-sdk/lib/matrixrtc";

/**
 * Calculates the initial mute state for media devices based on configuration.
 *
 * It is not always possible to start the call with audio/video unmuted due to
 * privacy concerns. This function encapsulates the logic to determine the
 * appropriate initial state.
 *
 * @param allowJoinUnmutedViaIntent Whether the host vouches for the intent
 *   enough to start the user unmuted without a lobby (see
 *   `HostBridge.allowJoinUnmutedViaIntent`).
 */
export function calculateInitialMuteState(
  skipLobby: boolean,
  callIntent: RTCCallIntent | undefined,
  allowJoinUnmutedViaIntent: boolean,
  startWithCameraMuted?: boolean,
): { audioEnabled: boolean; videoEnabled: boolean } {
  logger.debug(
    `calculateInitialMuteState: skipLobby=${skipLobby}, callIntent=${callIntent} allowJoinUnmutedViaIntent=${allowJoinUnmutedViaIntent}`,
  );

  if (skipLobby && !allowJoinUnmutedViaIntent) {
    // The lobby is skipped, so the user gets no chance to adjust their devices
    // before joining, and nobody has vouched for the intent: default to muted
    // to protect their privacy.
    return {
      audioEnabled: false,
      videoEnabled: false,
    };
  }

  // By default, camera is disabled for all calls to protect user privacy.
  // The host client can explicitly set startWithCameraMuted=false to allow
  // the camera to be enabled based on the call intent.
  const videoEnabled =
    startWithCameraMuted === false ? callIntent != "audio" : false;
  return {
    audioEnabled: true,
    videoEnabled,
  };
}
