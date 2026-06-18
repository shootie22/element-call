/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type FC } from "react";
import { VideoTrack } from "@livekit/components-react";

import { type CallViewModel } from "../state/CallViewModel/CallViewModel";
import { type MemberMediaViewModel } from "../state/media/MemberMediaViewModel";
import { useBehavior } from "../useBehavior";
import styles from "./FeedOnlyView.module.css";

interface Props {
  vm: CallViewModel;
  includeSelf: boolean;
}

/**
 * A chrome-less view that renders only the active camera/screenshare video
 * feeds, stacked. Used when the host (Element Web) embeds the call widget in its
 * call panel and wants just the raw video, no header/footer/tiles.
 */
export const FeedOnlyView: FC<Props> = ({ vm, includeSelf }) => {
  const media = useBehavior(vm.feedOnlyMedia$);
  const feeds = includeSelf ? media : media.filter((m) => !m.local);

  return (
    <div className={styles.feedOnly}>
      {feeds.map((m) => (
        <FeedTile key={m.id} media={m} />
      ))}
    </div>
  );
};

const FeedTile: FC<{ media: MemberMediaViewModel }> = ({ media }) => {
  const video = useBehavior(media.video$);
  if (!video || video.publication === undefined) return null;
  return (
    <VideoTrack
      trackRef={video}
      className={styles.video}
      data-fit={media.type === "screen share" ? "contain" : "cover"}
    />
  );
};
