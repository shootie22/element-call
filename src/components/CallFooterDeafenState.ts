/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

/**
 * Shared state to remember the user's microphone mute state before they
 * deafen, so that undeafening can restore it correctly.
 */
export let savedMicBeforeDeafen = false;

export function saveMicBeforeDeafen(value: boolean): void {
    savedMicBeforeDeafen = value;
}
