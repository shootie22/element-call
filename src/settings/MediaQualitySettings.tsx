/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type ChangeEvent, type FC, useState } from "react";
import { useTranslation } from "react-i18next";

import { FieldRow, InputField } from "../input/Input";
import { Slider } from "../Slider";
import {
  advancedCamera as advancedCameraSetting,
  advancedScreenShare as advancedScreenShareSetting,
  cameraBitrate as cameraBitrateSetting,
  cameraCodec as cameraCodecSetting,
  cameraFramerate as cameraFramerateSetting,
  cameraResolution as cameraResolutionSetting,
  screenShareBitrate as screenShareBitrateSetting,
  screenShareCodec as screenShareCodecSetting,
  screenShareFramerate as screenShareFramerateSetting,
  screenShareResolution as screenShareResolutionSetting,
  type Setting,
  type VideoCodec,
  useSetting,
} from "./settings";
import styles from "./SettingsModal.module.css";

interface MediaQualitySettingsProps {
  id: string;
  header: string;
  toggleLabel: string;
  description: string;
  toggleSetting: Setting<boolean>;
  resolutionSetting: Setting<string>;
  framerateSetting: Setting<number>;
  bitrateSetting: Setting<number>;
  codecSetting: Setting<VideoCodec>;
  resolutionOptions: { value: string; label: string }[];
  bitrateRange: { min: number; max: number; step: number };
}

const MediaQualitySettings: FC<MediaQualitySettingsProps> = ({
  id,
  header,
  toggleLabel,
  description,
  toggleSetting,
  resolutionSetting,
  framerateSetting,
  bitrateSetting,
  codecSetting,
  resolutionOptions,
  bitrateRange,
}) => {
  const { t } = useTranslation();
  const [advancedEnabled, setAdvancedEnabled] = useSetting(toggleSetting);
  const [resolution, setResolution] = useSetting(resolutionSetting);
  const [framerate, setFramerate] = useSetting(framerateSetting);
  const [framerateRaw, setFramerateRaw] = useState(framerate);
  const [bitrate, setBitrate] = useSetting(bitrateSetting);
  const [bitrateRaw, setBitrateRaw] = useState(bitrate);
  const [codec, setCodec] = useSetting(codecSetting);

  return (
    <section className={styles.mediaQualitySettings}>
      <h4>{header}</h4>
      <FieldRow>
        <InputField
          id={`${id}Toggle`}
          label={toggleLabel}
          description={description}
          type="checkbox"
          checked={advancedEnabled}
          onChange={(e): void => setAdvancedEnabled(e.target.checked)}
        />
      </FieldRow>
      {advancedEnabled && (
        <>
          <div className={styles.volumeSlider}>
            <label htmlFor={`${id}Resolution`}>
              {t("settings.resolution_label", "Resolution")}
            </label>
            <select
              id={`${id}Resolution`}
              value={resolution}
              onChange={(e: ChangeEvent<HTMLSelectElement>): void =>
                setResolution(e.target.value)
              }
            >
              {resolutionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.volumeSlider}>
            <label>
              {t("settings.framerate_label", "Framerate")}
              {": "}
              <span className={styles.settingValue}>{framerateRaw} fps</span>
            </label>
            <Slider
              label={t("settings.framerate_label", "Framerate")}
              value={framerateRaw}
              onValueChange={setFramerateRaw}
              onValueCommit={setFramerate}
              min={5}
              max={60}
              step={5}
              tooltipFormatter={(v): string => `${v} fps`}
            />
          </div>
          <div className={styles.volumeSlider}>
            <label>
              {t("settings.bitrate_label", "Bitrate")}
              {": "}
              <span className={styles.settingValue}>
                {(bitrateRaw / 1_000_000).toFixed(1)} Mbps
              </span>
            </label>
            <Slider
              label={t("settings.bitrate_label", "Bitrate")}
              value={bitrateRaw}
              onValueChange={setBitrateRaw}
              onValueCommit={setBitrate}
              min={bitrateRange.min}
              max={bitrateRange.max}
              step={bitrateRange.step}
              tooltipFormatter={(v): string =>
                `${(v / 1_000_000).toFixed(1)} Mbps`
              }
            />
          </div>
          <div className={styles.volumeSlider}>
            <label htmlFor={`${id}Codec`}>
              {t("settings.codec_label", "Codec")}
            </label>
            <select
              id={`${id}Codec`}
              value={codec}
              onChange={(e: ChangeEvent<HTMLSelectElement>): void =>
                setCodec(e.target.value as VideoCodec)
              }
            >
              <option value="vp8">VP8</option>
              <option value="vp9">VP9</option>
              <option value="h264">H.264</option>
              <option value="av1">AV1</option>
            </select>
          </div>
        </>
      )}
    </section>
  );
};

export const CameraQualitySettings: FC = () => {
  const { t } = useTranslation();

  return (
    <MediaQualitySettings
      id="camera"
      header={t("settings.camera_header", "Camera quality")}
      toggleLabel={t(
        "settings.advanced_camera_label",
        "Advanced camera settings",
      )}
      description={t(
        "settings.advanced_camera_description",
        "Configure resolution, framerate, bitrate, and codec for camera video. Changes apply on next call join.",
      )}
      toggleSetting={advancedCameraSetting}
      resolutionSetting={cameraResolutionSetting}
      framerateSetting={cameraFramerateSetting}
      bitrateSetting={cameraBitrateSetting}
      codecSetting={cameraCodecSetting}
      resolutionOptions={[
        { value: "640x360", label: "360p" },
        { value: "960x540", label: "540p" },
        { value: "1280x720", label: "720p" },
        { value: "1920x1080", label: "1080p" },
        { value: "2560x1440", label: "1440p" },
      ]}
      bitrateRange={{ min: 200_000, max: 8_000_000, step: 100_000 }}
    />
  );
};

export const ScreenShareQualitySettings: FC = () => {
  const { t } = useTranslation();

  return (
    <MediaQualitySettings
      id="screenShare"
      header={t("settings.screen_share_header", "Screen sharing")}
      toggleLabel={t(
        "settings.advanced_screen_share_label",
        "Advanced screen share settings",
      )}
      description={t(
        "settings.advanced_screen_share_description",
        "Configure resolution, framerate, bitrate, and codec for screen sharing",
      )}
      toggleSetting={advancedScreenShareSetting}
      resolutionSetting={screenShareResolutionSetting}
      framerateSetting={screenShareFramerateSetting}
      bitrateSetting={screenShareBitrateSetting}
      codecSetting={screenShareCodecSetting}
      resolutionOptions={[
        { value: "1024x576", label: "576p" },
        { value: "1280x720", label: "720p" },
        { value: "1920x1080", label: "1080p" },
        { value: "2560x1440", label: "1440p" },
        { value: "3840x2160", label: "4K" },
      ]}
      bitrateRange={{ min: 500_000, max: 15_000_000, step: 500_000 }}
    />
  );
};
