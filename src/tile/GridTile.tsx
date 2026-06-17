/*
Copyright 2022-2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  type ComponentProps,
  type FC,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { type animated } from "@react-spring/web";
import classNames from "classnames";
import { useTranslation } from "react-i18next";
import {
  MicOnSolidIcon,
  MicOffSolidIcon,
  MicOffIcon,
  OverflowHorizontalIcon,
  VolumeOnIcon,
  VolumeOnSolidIcon,
  VolumeOffIcon,
  VisibilityOnIcon,
  UserProfileIcon,
  VolumeOffSolidIcon,
  SwitchCameraSolidIcon,
  VideoCallSolidIcon,
  VoiceCallSolidIcon,
  EndCallIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import {
  ContextMenu,
  MenuItem,
  ToggleMenuItem,
  Menu,
} from "@vector-im/compound-web";
import { useObservableEagerState } from "observable-hooks";

import styles from "./GridTile.module.css";
import { Slider } from "../Slider";
import { MediaView } from "./MediaView";
import { useLatest } from "../useLatest";
import { type GridTileViewModel } from "../state/TileViewModel";
import { useMergedRefs } from "../useMergedRefs";
import { useReactionsSender } from "../reactions/useReactionsSender";
import { useBehavior } from "../useBehavior";
import { type LocalUserMediaViewModel } from "../state/media/LocalUserMediaViewModel";
import { type RemoteUserMediaViewModel } from "../state/media/RemoteUserMediaViewModel";
import { type UserMediaViewModel } from "../state/media/UserMediaViewModel";
import { type RingingMediaViewModel } from "../state/media/RingingMediaViewModel";
import { type ScreenShareViewModel } from "../state/media/ScreenShareViewModel";
import { type RemoteScreenShareViewModel } from "../state/media/RemoteScreenShareViewModel";
import { constant } from "../state/Behavior";

interface TileProps {
  ref?: Ref<HTMLDivElement>;
  className?: string;
  style?: ComponentProps<typeof animated.div>["style"];
  targetWidth: number;
  targetHeight: number;
  displayName: string;
  mxcAvatarUrl: string | undefined;
  showNameTags: boolean;
  focusable: boolean;
  onFocusMedia: ((mediaId: string) => void) | null;
}

interface RingingMediaTileProps extends TileProps {
  vm: RingingMediaViewModel;
}

const RingingMediaTile: FC<RingingMediaTileProps> = ({
  vm,
  className,
  onFocusMedia: _onFocusMedia,
  ...props
}) => {
  const { t } = useTranslation();
  const pickupState = useBehavior(vm.pickupState$);
  const videoEnabled = useBehavior(vm.videoEnabled$);

  return (
    <MediaView
      className={classNames(className, styles.tile)}
      video={undefined}
      userId={vm.userId}
      unencryptedWarning={false}
      status={
        pickupState === "ringing"
          ? {
              text: t("video_tile.calling"),
              Icon: videoEnabled ? VideoCallSolidIcon : VoiceCallSolidIcon,
            }
          : { text: t("video_tile.call_ended"), Icon: EndCallIcon }
      }
      videoEnabled={videoEnabled}
      videoFit="cover"
      mirror={false}
      {...props}
    />
  );
};

interface UserMediaTileProps extends TileProps {
  vm: UserMediaViewModel;
  showSpeakingIndicators: boolean;
  mirror: boolean;
  playbackMuted: boolean;
  waitingForMedia?: boolean;
  primaryButton?: ReactNode;
  menuStart?: ReactNode;
  menuEnd?: ReactNode;
  focusUrl: string | undefined;
}

const UserMediaTile: FC<UserMediaTileProps> = ({
  ref,
  vm,
  showSpeakingIndicators,
  playbackMuted,
  waitingForMedia,
  primaryButton,
  menuStart,
  menuEnd,
  className,
  focusUrl,
  displayName,
  mxcAvatarUrl,
  focusable,
  onFocusMedia,
  targetWidth,
  targetHeight,
  ...props
}) => {
  const { toggleRaisedHand } = useReactionsSender();
  const { t } = useTranslation();
  const video = useBehavior(vm.video$);
  const unencryptedWarning = useBehavior(vm.unencryptedWarning$);
  const audioStreamStats = useObservableEagerState<
    RTCInboundRtpStreamStats | RTCOutboundRtpStreamStats | undefined
  >(vm.audioStreamStats$);
  const videoStreamStats = useObservableEagerState<
    RTCInboundRtpStreamStats | RTCOutboundRtpStreamStats | undefined
  >(vm.videoStreamStats$);
  const audioEnabled = useBehavior(vm.audioEnabled$);
  const videoEnabled = useBehavior(vm.videoEnabled$);
  const speaking = useBehavior(vm.speaking$);
  const videoFit = useBehavior(vm.videoFit$);

  const rtcBackendIdentity = vm.rtcBackendIdentity;
  const handRaised = useBehavior(vm.handRaised$);
  const reaction = useBehavior(vm.reaction$);

  // Whenever bounds change, inform the viewModel
  useEffect(() => {
    if (targetWidth > 0 && targetHeight > 0) {
      vm.setTargetDimensions(targetWidth, targetHeight);
    }
  }, [targetWidth, targetHeight, vm]);

  const AudioIcon = playbackMuted
    ? VolumeOffSolidIcon
    : audioEnabled
      ? MicOnSolidIcon
      : MicOffSolidIcon;
  const audioIconLabel = playbackMuted
    ? t("video_tile.muted_for_me")
    : audioEnabled
      ? t("microphone_on")
      : t("microphone_off");

  const [menuOpen, setMenuOpen] = useState(false);
  const menu = (
    <>
      {menuStart}
      {/*
       No additional menu item (used to be the manual fit to frame.
       Placeholder for future menu items that should be placed here.
       */}
      {menuEnd}
    </>
  );

  const raisedHandOnClick = vm.local
    ? (): void => void toggleRaisedHand()
    : undefined;

  const showSpeaking = showSpeakingIndicators && speaking;
  const onClick = useCallback(() => onFocusMedia?.(vm.id), [onFocusMedia, vm]);

  const tile = (
    <MediaView
      ref={ref}
      video={video}
      userId={vm.userId}
      unencryptedWarning={unencryptedWarning}
      videoEnabled={videoEnabled}
      videoFit={videoFit}
      className={classNames(className, styles.tile, {
        [styles.speaking]: showSpeaking,
        [styles.handRaised]: !showSpeaking && handRaised,
      })}
      nameTagLeadingIcon={
        <AudioIcon
          width={20}
          height={20}
          aria-label={audioIconLabel}
          data-muted={playbackMuted || !audioEnabled}
          className={styles.muteIcon}
        />
      }
      displayName={displayName}
      mxcAvatarUrl={mxcAvatarUrl}
      focusable={focusable}
      onClick={onClick}
      primaryButton={
        primaryButton ?? (
          <Menu
            open={menuOpen}
            onOpenChange={setMenuOpen}
            title={displayName}
            trigger={
              <button
                aria-label={t("common.options")}
                tabIndex={focusable ? undefined : -1}
              >
                <OverflowHorizontalIcon aria-hidden width={20} height={20} />
              </button>
            }
            side="left"
            align="start"
          >
            {menu}
          </Menu>
        )
      }
      raisedHandTime={handRaised ?? undefined}
      currentReaction={reaction ?? undefined}
      raisedHandOnClick={raisedHandOnClick}
      waitingForMedia={waitingForMedia}
      focusUrl={focusUrl}
      audioStreamStats={audioStreamStats}
      videoStreamStats={videoStreamStats}
      rtcBackendIdentity={rtcBackendIdentity}
      targetWidth={targetWidth}
      targetHeight={targetHeight}
      {...props}
    />
  );

  return (
    <ContextMenu title={displayName} trigger={tile} hasAccessibleAlternative>
      {menu}
    </ContextMenu>
  );
};

UserMediaTile.displayName = "UserMediaTile";

interface ScreenShareMediaTileProps extends TileProps {
  vm: ScreenShareViewModel;
}

const RemoteScreenShareVolumeButton: FC<{
  vm: RemoteScreenShareViewModel;
  focusable: boolean;
}> = ({ vm, focusable }) => {
  const { t } = useTranslation();
  const audioEnabled = useBehavior(vm.audioEnabled$);
  const playbackMuted = useBehavior(vm.playbackMuted$);
  const playbackVolume = useBehavior(vm.playbackVolume$);
  const [menuOpen, setMenuOpen] = useState(false);
  const VolumeIcon = playbackMuted ? VolumeOffIcon : VolumeOnIcon;
  const VolumeSolidIcon = playbackMuted
    ? VolumeOffSolidIcon
    : VolumeOnSolidIcon;
  const onMuteButtonClick = useCallback(() => vm.togglePlaybackMuted(), [vm]);
  const onVolumeChange = useCallback(
    (v: number) => vm.adjustPlaybackVolume(v),
    [vm],
  );
  const onVolumeCommit = useCallback(() => vm.commitPlaybackVolume(), [vm]);

  return (
    audioEnabled && (
      <Menu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title={t("video_tile.screen_share_volume")}
        trigger={
          <button
            aria-label={t("video_tile.screen_share_volume")}
            tabIndex={focusable ? undefined : -1}
          >
            <VolumeSolidIcon aria-hidden width={20} height={20} />
          </button>
        }
        side="left"
        align="start"
      >
        <MenuItem
          as="div"
          className={styles.volumeMenuItem}
          onSelect={null}
          label={null}
          hideChevron={true}
        >
          <button className={styles.menuMuteButton} onClick={onMuteButtonClick}>
            <VolumeIcon aria-hidden width={24} height={24} />
          </button>
          <Slider
            className={styles.volumeSlider}
            label={t("video_tile.volume")}
            value={playbackVolume}
            min={0}
            max={1}
            step={0.01}
            onValueChange={onVolumeChange}
            onValueCommit={onVolumeCommit}
          />
        </MenuItem>
      </Menu>
    )
  );
};

const ScreenShareMediaTile: FC<ScreenShareMediaTileProps> = ({
  ref,
  vm,
  className,
  displayName,
  mxcAvatarUrl,
  focusable,
  onFocusMedia,
  ...props
}) => {
  const video = useBehavior(vm.video$);
  const unencryptedWarning = useBehavior(vm.unencryptedWarning$);
  const focusUrl = useBehavior(vm.focusUrl$);
  const videoEnabled = useBehavior(
    vm.local ? constant(true) : vm.videoEnabled$,
  );
  const onClick = useCallback(() => onFocusMedia?.(vm.id), [onFocusMedia, vm]);

  return (
    <MediaView
      ref={ref}
      video={video}
      userId={vm.userId}
      unencryptedWarning={unencryptedWarning}
      videoEnabled={videoEnabled}
      videoFit="contain"
      mirror={false}
      className={classNames(className, styles.tile)}
      displayName={displayName}
      mxcAvatarUrl={mxcAvatarUrl}
      focusable={focusable}
      primaryButton={
        !vm.local ? (
          <RemoteScreenShareVolumeButton vm={vm} focusable={focusable} />
        ) : undefined
      }
      focusUrl={focusUrl}
      onClick={onClick}
      {...props}
    />
  );
};

interface LocalUserMediaTileProps extends TileProps {
  vm: LocalUserMediaViewModel;
  showSpeakingIndicators: boolean;
  onOpenProfile: (() => void) | null;
}

const LocalUserMediaTile: FC<LocalUserMediaTileProps> = ({
  ref,
  vm,
  onOpenProfile,
  focusable,
  ...props
}) => {
  const { t } = useTranslation();
  const mirror = useBehavior(vm.mirror$);
  const alwaysShow = useBehavior(vm.alwaysShow$);
  const switchCamera = useBehavior(vm.switchCamera$);
  const focusUrl = useBehavior(vm.focusUrl$);

  const latestAlwaysShow = useLatest(alwaysShow);
  const onSelectAlwaysShow = useCallback(
    (e: Event) => {
      e.preventDefault();
      vm.setAlwaysShow(!latestAlwaysShow.current);
    },
    [vm, latestAlwaysShow],
  );

  return (
    <UserMediaTile
      ref={ref}
      vm={vm}
      playbackMuted={false}
      mirror={mirror}
      primaryButton={
        switchCamera === null ? undefined : (
          <button
            className={styles.switchCamera}
            aria-label={t("switch_camera")}
            onClick={switchCamera}
            tabIndex={focusable ? undefined : -1}
          >
            <SwitchCameraSolidIcon aria-hidden width={20} height={20} />
          </button>
        )
      }
      menuStart={
        <ToggleMenuItem
          Icon={VisibilityOnIcon}
          label={t("video_tile.always_show")}
          checked={alwaysShow}
          onSelect={onSelectAlwaysShow}
        />
      }
      menuEnd={
        onOpenProfile && (
          <MenuItem
            Icon={UserProfileIcon}
            label={t("common.profile")}
            onSelect={onOpenProfile}
          />
        )
      }
      focusable={focusable}
      focusUrl={focusUrl}
      {...props}
    />
  );
};

LocalUserMediaTile.displayName = "LocalUserMediaTile";

interface RemoteUserMediaTileProps extends TileProps {
  vm: RemoteUserMediaViewModel;
  showSpeakingIndicators: boolean;
}

const RemoteUserMediaTile: FC<RemoteUserMediaTileProps> = ({
  ref,
  vm,
  ...props
}) => {
  const { t } = useTranslation();
  const waitingForMedia = useBehavior(vm.waitingForMedia$);
  const playbackMuted = useBehavior(vm.playbackMuted$);
  const playbackVolume = useBehavior(vm.playbackVolume$);
  const focusUrl = useBehavior(vm.focusUrl$);

  const onSelectMute = useCallback(
    (e: Event) => {
      e.preventDefault();
      vm.togglePlaybackMuted();
    },
    [vm],
  );

  const VolumeIcon = playbackMuted ? VolumeOffIcon : VolumeOnIcon;

  return (
    <UserMediaTile
      ref={ref}
      vm={vm}
      waitingForMedia={waitingForMedia}
      playbackMuted={playbackMuted}
      mirror={false}
      menuStart={
        <>
          <ToggleMenuItem
            Icon={MicOffIcon}
            label={t("video_tile.mute_for_me")}
            checked={playbackMuted}
            onSelect={onSelectMute}
          />
          {/* TODO: Figure out how to make this slider keyboard accessible */}
          <MenuItem as="div" Icon={VolumeIcon} label={null} onSelect={null}>
            <Slider
              className={styles.volumeSlider}
              label={t("video_tile.volume")}
              value={playbackVolume}
              onValueChange={vm.adjustPlaybackVolume}
              onValueCommit={vm.commitPlaybackVolume}
              min={0}
              max={1}
              step={0.01}
            />
          </MenuItem>
        </>
      }
      focusUrl={focusUrl}
      {...props}
    />
  );
};

RemoteUserMediaTile.displayName = "RemoteUserMediaTile";

interface GridTileProps {
  ref?: Ref<HTMLDivElement>;
  vm: GridTileViewModel;
  onOpenProfile: (() => void) | null;
  targetWidth: number;
  targetHeight: number;
  className?: string;
  style?: ComponentProps<typeof animated.div>["style"];
  showSpeakingIndicators: boolean;
  showNameTags: boolean;
  focusable: boolean;
  onFocusMedia: ((mediaId: string) => void) | null;
}

export const GridTile: FC<GridTileProps> = ({
  ref: theirRef,
  vm,
  showSpeakingIndicators,
  onOpenProfile,
  ...props
}) => {
  const ourRef = useRef<HTMLDivElement | null>(null);
  const ref = useMergedRefs(ourRef, theirRef);
  const media = useBehavior(vm.media$);
  const displayName = useBehavior(media.displayName$);
  const mxcAvatarUrl = useBehavior(media.mxcAvatarUrl$);

  if (media.type === "ringing") {
    return (
      <RingingMediaTile
        ref={ref}
        vm={media}
        displayName={displayName}
        mxcAvatarUrl={mxcAvatarUrl}
        {...props}
      />
    );
  } else if (media.type === "screen share") {
    return (
      <ScreenShareMediaTile
        ref={ref}
        vm={media}
        displayName={displayName}
        mxcAvatarUrl={mxcAvatarUrl}
        {...props}
      />
    );
  } else if (media.local) {
    return (
      <LocalUserMediaTile
        ref={ref}
        vm={media}
        showSpeakingIndicators={showSpeakingIndicators}
        onOpenProfile={onOpenProfile}
        displayName={displayName}
        mxcAvatarUrl={mxcAvatarUrl}
        {...props}
      />
    );
  } else {
    return (
      <RemoteUserMediaTile
        ref={ref}
        vm={media}
        showSpeakingIndicators={showSpeakingIndicators}
        displayName={displayName}
        mxcAvatarUrl={mxcAvatarUrl}
        {...props}
      />
    );
  }
};

GridTile.displayName = "GridTile";
