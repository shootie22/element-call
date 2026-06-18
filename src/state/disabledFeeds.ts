/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { useSyncExternalStore } from "react";

/**
 * Tracks which remote feeds (cameras / screen shares) the local user has
 * manually disabled, to save bandwidth and CPU. Disabling a feed unsubscribes
 * from its LiveKit track locally — it only affects this client's view, never
 * what the remote participant publishes or what anyone else sees.
 *
 * Feeds are keyed by the media view-model `id` (`<userId>:<index>`), which is
 * stable across the remote participant restarting that track, so a feed the
 * user turned off stays off until they turn it back on. The state is held in
 * memory only and is naturally cleared when the call (page) ends.
 */
const disabledIds = new Set<string>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Whether the feed with the given media id is currently disabled. */
export function isFeedDisabled(id: string): boolean {
  return disabledIds.has(id);
}

/** Toggle whether the feed with the given media id is disabled. */
export function toggleFeedDisabled(id: string): void {
  if (disabledIds.has(id)) disabledIds.delete(id);
  else disabledIds.add(id);
  emit();
}

/** React hook returning whether the given feed is currently disabled. */
export function useFeedDisabled(id: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => disabledIds.has(id),
    () => false,
  );
}
