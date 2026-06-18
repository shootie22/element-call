/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type FC, useCallback } from "react";
import useMeasure from "react-use-measure";
import { logger } from "matrix-js-sdk/lib/logger";

import { type CallViewModel } from "../state/CallViewModel/CallViewModel";
import { type MemberMediaViewModel } from "../state/media/MemberMediaViewModel";
import { useBehavior } from "../useBehavior";
import { MediaView } from "../tile/MediaView";
import { ElementWidgetActions, widget } from "../widget";
import styles from "./FeedOnlyView.module.css";

interface Props {
  vm: CallViewModel;
  includeSelf: boolean;
}

/**
 * A chrome-less view that renders only the active camera/screenshare video
 * feeds, stacked. Used when the host (Element Web) embeds the call widget in its
 * call panel and wants just the raw video, no header/footer/tiles. Each feed
 * keeps the full-call zoom/pan behaviour and shows the owner's name tag;
 * double-clicking a feed asks the host to expand to the full call UI.
 */
export const FeedOnlyView: FC<Props> = ({ vm, includeSelf }) => {
  const media = useBehavior(vm.feedOnlyMedia$);
  const feeds = includeSelf ? media : media.filter((m) => !m.local);

  const onExpand = useCallback(() => {
    widget?.api.transport
      .send(ElementWidgetActions.Expand, {})
      .catch((e) => logger.warn("Could not send Expand action to host", e));
  }, []);

  return (
    <div className={styles.feedOnly}>
      {feeds.map((m) => (
        <FeedTile key={m.id} media={m} onExpand={onExpand} />
      ))}
    </div>
  );
};

const FeedTile: FC<{ media: MemberMediaViewModel; onExpand: () => void }> = ({
  media,
  onExpand,
}) => {
  const [ref, bounds] = useMeasure();
  const video = useBehavior(media.video$);
  const displayName = useBehavior(media.displayName$);
  const mxcAvatarUrl = useBehavior(media.mxcAvatarUrl$);
  const unencryptedWarning = useBehavior(media.unencryptedWarning$);

  if (!video || video.publication === undefined) return null;

  return (
    <MediaView
      ref={ref}
      className={styles.video}
      targetWidth={bounds.width}
      targetHeight={bounds.height}
      video={video}
      videoFit={media.type === "screen share" ? "contain" : "cover"}
      mirror={media.type === "user" && media.local}
      userId={media.userId}
      videoEnabled
      unencryptedWarning={unencryptedWarning}
      showNameTags
      displayName={displayName}
      mxcAvatarUrl={mxcAvatarUrl}
      focusable={false}
      onDoubleClick={onExpand}
    />
  );
};
