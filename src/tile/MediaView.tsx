/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type TrackReferenceOrPlaceholder } from "@livekit/components-core";
import { animated } from "@react-spring/web";
import {
  type FC,
  type ComponentProps,
  type ReactNode,
  type ComponentType,
  type SVGAttributes,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type WheelEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import classNames from "classnames";
import { VideoTrack } from "@livekit/components-react";
import { RemoteTrackPublication } from "livekit-client";
import { Text, Tooltip } from "@vector-im/compound-web";
import {
  ErrorSolidIcon,
  VideoCallOffSolidIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";

import styles from "./MediaView.module.css";
import { Avatar } from "../Avatar";
import { RaisedHandIndicator } from "../reactions/RaisedHandIndicator";
import {
  showConnectionStats as showConnectionStatsSetting,
  showHandRaisedTimer,
  useSetting,
} from "../settings/settings";
import { type ReactionOption } from "../reactions";
import { ReactionIndicator } from "../reactions/ReactionIndicator";
import { RTCConnectionStats } from "../RTCConnectionStats";

const DEFAULT_ZOOM = 1;
const MAX_ZOOM = 12;
const RESET_ZOOM_THRESHOLD = 1.02;
const ZOOM_SENSITIVITY = 0.001;
const MIN_PAN_DISTANCE = 2;
const MOUSE_DRAG_POINTER_ID = -1;

interface ZoomState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  startOffsetX: number;
  startOffsetY: number;
  moved: boolean;
}

const defaultZoom = (): ZoomState => ({
  scale: DEFAULT_ZOOM,
  offsetX: 0,
  offsetY: 0,
});

const clampOffset = (
  scale: number,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number,
): Pick<ZoomState, "offsetX" | "offsetY"> => {
  const maxOffsetX = (width * (scale - DEFAULT_ZOOM)) / 2;
  const maxOffsetY = (height * (scale - DEFAULT_ZOOM)) / 2;

  return {
    offsetX: Math.min(maxOffsetX, Math.max(-maxOffsetX, offsetX)),
    offsetY: Math.min(maxOffsetY, Math.max(-maxOffsetY, offsetY)),
  };
};

interface Props extends ComponentProps<typeof animated.div> {
  className?: string;
  style?: ComponentProps<typeof animated.div>["style"];
  targetWidth: number;
  targetHeight: number;
  video: TrackReferenceOrPlaceholder | undefined;
  videoFit: "cover" | "contain";
  mirror: boolean;
  userId: string;
  videoEnabled: boolean;
  unencryptedWarning: boolean;
  status?: { text: string; Icon: ComponentType<SVGAttributes<SVGElement>> };
  showNameTags: boolean;
  nameTagLeadingIcon?: ReactNode;
  displayName: string;
  mxcAvatarUrl: string | undefined;
  focusable: boolean;
  primaryButton?: ReactNode;
  raisedHandTime?: Date;
  currentReaction?: ReactionOption;
  raisedHandOnClick?: () => void;
  waitingForMedia?: boolean;
  audioStreamStats?: RTCInboundRtpStreamStats | RTCOutboundRtpStreamStats;
  videoStreamStats?: RTCInboundRtpStreamStats | RTCOutboundRtpStreamStats;
  rtcBackendIdentity?: string;
  // The focus url, mainly for debugging purposes
  focusUrl?: string;
  // When true, the local user has manually disabled this (remote) feed: we
  // unsubscribe from its track to save bandwidth/CPU and show a frozen last
  // frame instead of live video.
  feedDisabled?: boolean;
}

export const MediaView: FC<Props> = ({
  ref,
  className,
  style,
  targetWidth,
  targetHeight,
  video,
  videoFit,
  mirror,
  userId,
  videoEnabled,
  unencryptedWarning,
  showNameTags,
  nameTagLeadingIcon,
  displayName,
  mxcAvatarUrl,
  focusable,
  primaryButton,
  status,
  raisedHandTime,
  currentReaction,
  raisedHandOnClick,
  waitingForMedia,
  audioStreamStats,
  videoStreamStats,
  rtcBackendIdentity,
  focusUrl,
  feedDisabled = false,
  onClick,
  ...props
}) => {
  const { t } = useTranslation();
  const [handRaiseTimerVisible] = useSetting(showHandRaisedTimer);
  const [showConnectionStats] = useSetting(showConnectionStatsSetting);
  const [zoom, setZoom] = useState<ZoomState>(defaultZoom);
  const [panning, setPanning] = useState(false);
  const drag = useRef<DragState | null>(null);
  const suppressNextClick = useRef(false);

  // --- Per-feed disable (unsubscribe + frozen last frame) ---------------------
  const bgRef = useRef<HTMLDivElement>(null);
  // The captured last frame to show while the feed is disabled (data URL).
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);
  // Decouples removing the <VideoTrack> from `feedDisabled` so we can grab a
  // final frame from the still-mounted <video> before it goes away.
  const [videoUnmounted, setVideoUnmounted] = useState(false);
  // True between re-enabling the feed and the live video producing a frame, so
  // we can show a spinner over the frozen frame instead of a black flash.
  const [reEnabling, setReEnabling] = useState(false);

  const publication = video?.publication;

  // Capture the current frame of the live <video> into a data URL.
  const captureFrame = useCallback((): void => {
    const videoEl = bgRef.current?.querySelector("video");
    if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      ctx.drawImage(videoEl, 0, 0);
      setFrozenFrame(canvas.toDataURL("image/jpeg", 0.6));
    } catch {
      // Shouldn't happen for same-origin MediaStreams, but never let a capture
      // failure break the tile.
    }
  }, []);

  // Grab the last frame *before* unmounting the <VideoTrack>, then unmount it.
  useLayoutEffect(() => {
    if (feedDisabled && !videoUnmounted) {
      captureFrame();
      setVideoUnmounted(true);
    } else if (!feedDisabled && videoUnmounted) {
      setReEnabling(true);
      setVideoUnmounted(false);
    }
  }, [feedDisabled, videoUnmounted, captureFrame]);

  // Subscribe/unsubscribe the underlying remote track. Unsubscribing is what
  // actually saves bandwidth and decode cost; not rendering <VideoTrack> (above)
  // keeps adaptiveStream from silently re-subscribing.
  useEffect(() => {
    if (!(publication instanceof RemoteTrackPublication)) return;
    publication.setSubscribed(!feedDisabled);
  }, [publication, feedDisabled]);

  // Clear the spinner once live video is actually playing again.
  useEffect(() => {
    if (!reEnabling) return;
    const videoEl = bgRef.current?.querySelector("video");
    if (!videoEl) return;
    const done = (): void => setReEnabling(false);
    videoEl.addEventListener("playing", done);
    return (): void => videoEl.removeEventListener("playing", done);
  }, [reEnabling, publication]);

  const avatarSize = Math.round(Math.min(targetWidth, targetHeight) / 2);
  const hasVideo = video?.publication !== undefined && videoEnabled;
  const zoomed = zoom.scale !== DEFAULT_ZOOM;

  const resetZoom = useCallback(() => {
    setZoom(defaultZoom());
  }, []);

  useEffect(() => {
    if (!hasVideo) resetZoom();
  }, [hasVideo, resetZoom]);

  const onWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (!hasVideo) return;

      event.preventDefault();
      event.stopPropagation();

      const rect = event.currentTarget.getBoundingClientRect();
      const pointerX = event.clientX - rect.left - rect.width / 2;
      const pointerY = event.clientY - rect.top - rect.height / 2;

      setZoom((current) => {
        const nextScale = Math.min(
          MAX_ZOOM,
          Math.max(
            DEFAULT_ZOOM,
            current.scale * Math.exp(-event.deltaY * ZOOM_SENSITIVITY),
          ),
        );

        if (nextScale <= RESET_ZOOM_THRESHOLD) {
          return defaultZoom();
        }

        const scaleRatio = nextScale / current.scale;
        const offset = clampOffset(
          nextScale,
          pointerX - (pointerX - current.offsetX) * scaleRatio,
          pointerY - (pointerY - current.offsetY) * scaleRatio,
          rect.width,
          rect.height,
        );

        return {
          scale: nextScale,
          ...offset,
        };
      });
    },
    [hasVideo],
  );

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (
        drag.current !== null ||
        !hasVideo ||
        !zoomed ||
        (event.button !== 0 && event.buttons !== 1) ||
        (event.target as HTMLElement).closest("button")
      ) {
        return;
      }

      drag.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffsetX: zoom.offsetX,
        startOffsetY: zoom.offsetY,
        moved: false,
      };
      setPanning(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    },
    [hasVideo, zoom, zoomed],
  );

  const onMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (
        drag.current !== null ||
        !hasVideo ||
        !zoomed ||
        event.button !== 0 ||
        (event.target as HTMLElement).closest("button")
      ) {
        return;
      }

      drag.current = {
        pointerId: MOUSE_DRAG_POINTER_ID,
        startX: event.clientX,
        startY: event.clientY,
        startOffsetX: zoom.offsetX,
        startOffsetY: zoom.offsetY,
        moved: false,
      };
      setPanning(true);
      event.preventDefault();
    },
    [hasVideo, zoom, zoomed],
  );

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const currentDrag = drag.current;
    if (currentDrag === null || currentDrag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - currentDrag.startX;
    const deltaY = event.clientY - currentDrag.startY;
    const moved =
      Math.abs(deltaX) > MIN_PAN_DISTANCE ||
      Math.abs(deltaY) > MIN_PAN_DISTANCE;
    currentDrag.moved ||= moved;

    const rect = event.currentTarget.getBoundingClientRect();
    setZoom((current) => ({
      scale: current.scale,
      ...clampOffset(
        current.scale,
        currentDrag.startOffsetX + deltaX,
        currentDrag.startOffsetY + deltaY,
        rect.width,
        rect.height,
      ),
    }));

    event.preventDefault();
  }, []);

  const onMouseMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const currentDrag = drag.current;
    if (
      currentDrag === null ||
      currentDrag.pointerId !== MOUSE_DRAG_POINTER_ID
    ) {
      return;
    }

    const deltaX = event.clientX - currentDrag.startX;
    const deltaY = event.clientY - currentDrag.startY;
    const moved =
      Math.abs(deltaX) > MIN_PAN_DISTANCE ||
      Math.abs(deltaY) > MIN_PAN_DISTANCE;
    currentDrag.moved ||= moved;

    const rect = event.currentTarget.getBoundingClientRect();
    setZoom((current) => ({
      scale: current.scale,
      ...clampOffset(
        current.scale,
        currentDrag.startOffsetX + deltaX,
        currentDrag.startOffsetY + deltaY,
        rect.width,
        rect.height,
      ),
    }));

    event.preventDefault();
  }, []);

  const stopPanning = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const currentDrag = drag.current;
    if (currentDrag === null || currentDrag.pointerId !== event.pointerId) {
      return;
    }

    suppressNextClick.current = currentDrag.moved;
    drag.current = null;
    setPanning(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  const stopMousePanning = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const currentDrag = drag.current;
    if (
      currentDrag === null ||
      currentDrag.pointerId !== MOUSE_DRAG_POINTER_ID
    ) {
      return;
    }

    suppressNextClick.current = currentDrag.moved;
    drag.current = null;
    setPanning(false);
  }, []);

  const onTileClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (suppressNextClick.current) {
        suppressNextClick.current = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      onClick?.(event);
    },
    [onClick],
  );

  const videoStyle = {
    display: hasVideo ? "block" : "none",
    "--media-video-zoom": zoom.scale,
    "--media-video-offset-x": `${zoom.offsetX}px`,
    "--media-video-offset-y": `${zoom.offsetY}px`,
  } as CSSProperties;

  const warnings = unencryptedWarning && (
    <Tooltip
      label={t("common.unencrypted")}
      placement="bottom"
      isTriggerInteractive={false}
      nonInteractiveTriggerTabIndex={focusable ? undefined : -1}
    >
      <ErrorSolidIcon
        width={20}
        height={20}
        className={styles.errorIcon}
        role="img"
        aria-label={t("common.unencrypted")}
      />
    </Tooltip>
  );

  return (
    <animated.div
      className={classNames(styles.media, className, {
        [styles.mirror]: mirror,
      })}
      style={style}
      ref={ref}
      {...props}
      data-testid="videoTile"
      data-video-fit={videoFit}
      data-zoomed={zoomed}
      data-panning={panning}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopPanning}
      onPointerCancel={stopPanning}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stopMousePanning}
      onClick={onTileClick}
    >
      <div className={styles.bg} ref={bgRef}>
        <Avatar
          id={userId}
          name={displayName}
          size={avatarSize}
          src={mxcAvatarUrl}
          className={classNames(styles.avatar, {
            // When the avatar is overlaid with a status, make it translucent
            // for readability
            [styles.translucent]: status,
          })}
          style={{
            display:
              (video && videoEnabled && !feedDisabled) || frozenFrame
                ? "none"
                : "initial",
          }}
        />
        {video?.publication !== undefined && !videoUnmounted && (
          <VideoTrack
            trackRef={video}
            // There's no reason for this to be focusable
            tabIndex={-1}
            disablePictureInPicture
            style={videoStyle}
            data-testid="video"
          />
        )}
        {feedDisabled && frozenFrame && (
          <img
            className={styles.frozenFeed}
            src={frozenFrame}
            alt=""
            aria-hidden
          />
        )}
        {feedDisabled && (
          <div className={styles.feedDisabledBadge}>
            <VideoCallOffSolidIcon width={16} height={16} aria-hidden />
            <Text size="sm" weight="medium" as="span">
              {t("video_tile.feed_disabled")}
            </Text>
          </div>
        )}
        {reEnabling && (
          <div className={styles.feedSpinner} role="status">
            <div className={styles.feedSpinnerDot} />
          </div>
        )}
      </div>
      <div className={styles.fg}>
        <div className={styles.reactions}>
          <RaisedHandIndicator
            raisedHandTime={raisedHandTime}
            miniature={avatarSize < 96}
            showTimer={handRaiseTimerVisible}
            onClick={raisedHandOnClick}
            tabIndex={focusable ? undefined : -1}
          />
          {currentReaction && (
            <ReactionIndicator
              miniature={avatarSize < 96}
              emoji={currentReaction.emoji}
            />
          )}
        </div>
        {waitingForMedia && (
          <div className={styles.status}>
            {t("video_tile.waiting_for_media")}
            {showConnectionStats ? " " + rtcBackendIdentity : ""}
          </div>
        )}
        {showConnectionStats && (
          <>
            <RTCConnectionStats
              audio={audioStreamStats}
              video={videoStreamStats}
              focusUrl={focusUrl}
              rtcBackendIdentity={rtcBackendIdentity}
            />
          </>
        )}
        {status && (
          <div className={styles.status}>
            <status.Icon width={16} height={16} aria-hidden />
            <Text as="span" size="sm" weight="medium">
              {status.text}
            </Text>
          </div>
        )}
        {/* TODO: Bring this back once encryption status is less broken */}
        {/*encryptionStatus !== EncryptionStatus.Okay && (
            <div className={styles.status}>
              <Text as="span" size="sm" weight="medium" className={styles.name}>
                {encryptionStatus === EncryptionStatus.Connecting &&
                  t("e2ee_encryption_status.connecting")}
                {encryptionStatus === EncryptionStatus.KeyMissing &&
                  t("e2ee_encryption_status.key_missing")}
                {encryptionStatus === EncryptionStatus.KeyInvalid &&
                  t("e2ee_encryption_status.key_invalid")}
                {encryptionStatus === EncryptionStatus.PasswordInvalid &&
                  t("e2ee_encryption_status.password_invalid")}
              </Text>
            </div>
          )*/}
        {showNameTags && targetWidth >= 100 ? (
          <div className={styles.nameTag}>
            {nameTagLeadingIcon}
            <Text
              as="span"
              size="sm"
              weight="medium"
              className={styles.name}
              data-testid="name_tag"
            >
              {displayName}
            </Text>
            {warnings}
          </div>
        ) : (
          warnings
        )}
        {(zoomed || primaryButton) && (
          <div className={styles.actionButtons}>
            {zoomed && (
              <button
                type="button"
                className={styles.resetZoomButton}
                onClick={resetZoom}
                data-enabled="true"
                tabIndex={focusable ? undefined : -1}
              >
                {t("video_tile.reset_zoom")}
              </button>
            )}
            {primaryButton}
          </div>
        )}
      </div>
    </animated.div>
  );
};

MediaView.displayName = "MediaView";
