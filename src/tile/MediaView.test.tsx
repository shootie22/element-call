/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { describe, expect, it, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { TooltipProvider } from "@vector-im/compound-web";
import {
  type TrackReference,
  type TrackReferencePlaceholder,
} from "@livekit/components-core";
import { LocalTrackPublication, Track } from "livekit-client";
import { TrackInfo } from "@livekit/protocol";
import { type ComponentProps } from "react";

import { MediaView } from "./MediaView";
import { mockLocalParticipant } from "../utils/test";

describe("MediaView", () => {
  const participant = mockLocalParticipant({});
  const trackReferencePlaceholder: TrackReferencePlaceholder = {
    participant,
    source: Track.Source.Camera,
  };
  const trackReference: TrackReference = {
    ...trackReferencePlaceholder,
    publication: new LocalTrackPublication(
      Track.Kind.Video,
      new TrackInfo({ sid: "id", name: "name" }),
    ),
  };

  const baseProps: ComponentProps<typeof MediaView> = {
    displayName: "some name",
    videoEnabled: true,
    videoFit: "contain",
    targetWidth: 300,
    targetHeight: 200,
    mirror: false,
    unencryptedWarning: false,
    showNameTags: true,
    video: trackReference,
    userId: "@alice:example.com",
    mxcAvatarUrl: undefined,
    focusable: true,
  };

  const mockTileBounds = (tile: HTMLElement): void => {
    Object.defineProperty(tile, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 300,
        bottom: 200,
        width: 300,
        height: 200,
        toJSON: (): void => {},
      }),
    });
  };

  test("is accessible", async () => {
    const { container } = render(<MediaView {...baseProps} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  describe("placeholder track", () => {
    test("neither video nor avatar are shown", () => {
      render(<MediaView {...baseProps} video={trackReferencePlaceholder} />);
      expect(screen.queryByTestId("video")).toBeNull();
      expect(
        screen.queryAllByRole("img", { name: "@alice:example.com" }).length,
      ).toBe(0);
    });
  });

  describe("with no video", () => {
    it("shows avatar", () => {
      render(<MediaView {...baseProps} video={undefined} />);
      expect(
        screen.getByRole("img", { name: "@alice:example.com" }),
      ).toBeVisible();
      expect(screen.queryByTestId("video")).toBe(null);
    });
  });

  describe("name tag", () => {
    test("is shown with name", () => {
      render(<MediaView {...baseProps} displayName="Bob" />);
      expect(screen.getByTestId("name_tag")).toHaveTextContent("Bob");
    });
  });

  describe("waitingForMedia", () => {
    test("defaults to false", () => {
      render(<MediaView {...baseProps} />);
      expect(screen.queryAllByText("Waiting for media...").length).toBe(0);
    });
    test("shows and is accessible", async () => {
      const { container } = render(
        <TooltipProvider>
          <MediaView {...baseProps} waitingForMedia={true} />
        </TooltipProvider>,
      );
      expect(await axe(container)).toHaveNoViolations();
      expect(screen.getByText("Waiting for media...")).toBeVisible();
    });
  });

  describe("unencryptedWarning", () => {
    test("is shown and accessible", async () => {
      const { container } = render(
        <TooltipProvider>
          <MediaView {...baseProps} unencryptedWarning={true} />
        </TooltipProvider>,
      );
      expect(await axe(container)).toHaveNoViolations();
      expect(screen.getByRole("img", { name: "Not encrypted" })).toBeTruthy();
    });

    test("is shown and accessible even with name tag hidden", async () => {
      const { container } = render(
        <TooltipProvider>
          <MediaView {...baseProps} unencryptedWarning showNameTags={false} />
        </TooltipProvider>,
      );
      expect(await axe(container)).toHaveNoViolations();
      screen.getByRole("img", { name: "Not encrypted" });
    });

    test("is not shown", () => {
      render(
        <TooltipProvider>
          <MediaView {...baseProps} unencryptedWarning={false} />
        </TooltipProvider>,
      );
      expect(
        screen.queryAllByRole("img", { name: "Not encrypted" }).length,
      ).toBe(0);
    });
  });

  describe("videoEnabled", () => {
    test("just video is visible", () => {
      render(
        <TooltipProvider>
          <MediaView {...baseProps} videoEnabled={true} />
        </TooltipProvider>,
      );
      expect(screen.getByTestId("video")).toBeVisible();
      expect(screen.queryAllByRole("img", { name: "some name" }).length).toBe(
        0,
      );
    });

    test("just avatar is visible", () => {
      render(
        <TooltipProvider>
          <MediaView {...baseProps} videoEnabled={false} />
        </TooltipProvider>,
      );
      expect(
        screen.getByRole("img", { name: "@alice:example.com" }),
      ).toBeVisible();
      expect(screen.getByTestId("video")).not.toBeVisible();
    });
  });

  describe("zoom", () => {
    test("zooming in shows a reset button and applies video scale and offset", () => {
      render(<MediaView {...baseProps} />);
      const tile = screen.getByTestId("videoTile");
      mockTileBounds(tile);

      fireEvent.wheel(tile, { deltaY: -100, clientX: 75, clientY: 50 });

      expect(screen.getByRole("button", { name: "Reset zoom" })).toBeVisible();
      expect(
        Number(
          screen
            .getByTestId("video")
            .style.getPropertyValue("--media-video-zoom"),
        ),
      ).toBeGreaterThan(1);
      expect(
        screen
          .getByTestId("video")
          .style.getPropertyValue("--media-video-offset-x"),
      ).not.toBe("0px");
      expect(
        screen
          .getByTestId("video")
          .style.getPropertyValue("--media-video-offset-y"),
      ).not.toBe("0px");
    });

    test("reset button restores the default zoom", () => {
      render(<MediaView {...baseProps} />);
      const tile = screen.getByTestId("videoTile");
      mockTileBounds(tile);

      fireEvent.wheel(tile, { deltaY: -100, clientX: 75, clientY: 50 });
      fireEvent.click(screen.getByRole("button", { name: "Reset zoom" }));

      expect(
        screen.queryByRole("button", { name: "Reset zoom" }),
      ).not.toBeInTheDocument();
      expect(
        screen
          .getByTestId("video")
          .style.getPropertyValue("--media-video-zoom"),
      ).toBe("1");
      expect(
        screen
          .getByTestId("video")
          .style.getPropertyValue("--media-video-offset-x"),
      ).toBe("0px");
      expect(
        screen
          .getByTestId("video")
          .style.getPropertyValue("--media-video-offset-y"),
      ).toBe("0px");
    });

    test("zooming out past the threshold resets to default", () => {
      render(<MediaView {...baseProps} />);
      const tile = screen.getByTestId("videoTile");
      mockTileBounds(tile);

      fireEvent.wheel(tile, { deltaY: -500, clientX: 75, clientY: 50 });
      fireEvent.wheel(tile, { deltaY: 10_000, clientX: 75, clientY: 50 });

      expect(
        screen.queryByRole("button", { name: "Reset zoom" }),
      ).not.toBeInTheDocument();
      expect(
        screen
          .getByTestId("video")
          .style.getPropertyValue("--media-video-zoom"),
      ).toBe("1");
      expect(
        screen
          .getByTestId("video")
          .style.getPropertyValue("--media-video-offset-x"),
      ).toBe("0px");
      expect(
        screen
          .getByTestId("video")
          .style.getPropertyValue("--media-video-offset-y"),
      ).toBe("0px");
    });

    test("zoom resets when video is disabled", () => {
      const { rerender } = render(<MediaView {...baseProps} />);
      const tile = screen.getByTestId("videoTile");
      mockTileBounds(tile);

      fireEvent.wheel(tile, { deltaY: -100, clientX: 75, clientY: 50 });
      expect(screen.getByRole("button", { name: "Reset zoom" })).toBeVisible();

      rerender(<MediaView {...baseProps} videoEnabled={false} />);

      expect(
        screen.queryByRole("button", { name: "Reset zoom" }),
      ).not.toBeInTheDocument();
      expect(
        screen
          .getByTestId("video")
          .style.getPropertyValue("--media-video-zoom"),
      ).toBe("1");
      expect(
        screen
          .getByTestId("video")
          .style.getPropertyValue("--media-video-offset-x"),
      ).toBe("0px");
      expect(
        screen
          .getByTestId("video")
          .style.getPropertyValue("--media-video-offset-y"),
      ).toBe("0px");
    });

    test("does not zoom when no video is published", () => {
      render(<MediaView {...baseProps} video={trackReferencePlaceholder} />);
      const tile = screen.getByTestId("videoTile");
      mockTileBounds(tile);

      fireEvent.wheel(tile, { deltaY: -100, clientX: 75, clientY: 50 });

      expect(
        screen.queryByRole("button", { name: "Reset zoom" }),
      ).not.toBeInTheDocument();
    });

    test("dragging a zoomed tile pans within tile bounds", () => {
      render(<MediaView {...baseProps} />);
      const tile = screen.getByTestId("videoTile");
      const video = screen.getByTestId("video");
      mockTileBounds(tile);

      fireEvent.wheel(tile, { deltaY: -2000, clientX: 150, clientY: 100 });
      const scale = Number(video.style.getPropertyValue("--media-video-zoom"));

      fireEvent.mouseDown(tile, {
        button: 0,
        clientX: 150,
        clientY: 100,
      });
      fireEvent.mouseMove(tile, {
        clientX: 10_000,
        clientY: 10_000,
      });
      fireEvent.mouseUp(tile, {
        clientX: 10_000,
        clientY: 10_000,
      });

      expect(
        parseFloat(video.style.getPropertyValue("--media-video-offset-x")),
      ).toBeCloseTo((300 * (scale - 1)) / 2);
      expect(
        parseFloat(video.style.getPropertyValue("--media-video-offset-y")),
      ).toBeCloseTo((200 * (scale - 1)) / 2);
    });

    test("is accessible while zoomed", async () => {
      const { container } = render(<MediaView {...baseProps} />);
      const tile = screen.getByTestId("videoTile");
      mockTileBounds(tile);

      fireEvent.wheel(tile, { deltaY: -100, clientX: 75, clientY: 50 });

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
