/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { TooltipProvider } from "@vector-im/compound-web";
import { type MatrixClient } from "matrix-js-sdk";
import { axe } from "vitest-axe";

import { LobbyView } from "./LobbyView";
import { E2eeType } from "../e2ee/e2eeType";
import { mockMediaDevices, mockMuteStates } from "../utils/test";
import { MediaDevicesContext } from "../MediaDevicesContext";
import { type ProcessorState } from "../livekit/TrackProcessorContext";
import { type EncryptionSystem } from "../e2ee/sharedKeyManagement";
import lobbyStyles from "./LobbyView.module.css";
import headerStyles from "../Header.module.css";

vi.mock("@livekit/components-react", () => ({
  usePreviewTracks: (): unknown[] => [],
}));

vi.mock("../livekit/TrackProcessorContext", () => ({
  useTrackProcessor: (): ProcessorState => ({
    supported: false,
    processor: undefined,
  }),
  useTrackProcessorSync: (): void => {},
}));

vi.mock("react-use-measure", () => ({
  default: (): [() => void, object] => [(): void => {}, {}],
}));

vi.mock("../settings/SettingsModal", () => ({
  SettingsModal: (): null => null,
  defaultSettingsTab: "general",
}));

const mockMember = (userId: string, displayName: string) => ({
  userId,
  name: displayName,
  rawDisplayName: displayName,
  getMxcAvatarUrl: () => null,
});

const mockClient = {
  getUserId: () => "@user:example.org",
  getDeviceId: () => "DEVICE",
  getRoom: () => ({
    getMember: (userId: string) => {
      const members: Record<string, ReturnType<typeof mockMember>> = {
        "@alice:example.org": mockMember("@alice:example.org", "Alice"),
        "@bob:example.org": mockMember("@bob:example.org", "Bob"),
        "@charlie:example.org": mockMember("@charlie:example.org", "Charlie"),
      };
      return members[userId] ?? null;
    },
  }),
} as Partial<MatrixClient> as MatrixClient;

const matrixInfo = {
  userId: "@user:example.org",
  displayName: "Test User",
  avatarUrl: "",
  roomId: "!room:example.org",
  roomName: "Test Room",
  roomAlias: null,
  roomAvatar: null,
  e2eeSystem: { kind: E2eeType.NONE } satisfies EncryptionSystem,
};

function renderLobbyView(
  props: Partial<Parameters<typeof LobbyView>[0]> = {},
): ReturnType<typeof render> {
  const mediaDevices = mockMediaDevices({});
  const muteStates = mockMuteStates();

  return render(
    <BrowserRouter>
      <MediaDevicesContext value={mediaDevices}>
        <TooltipProvider>
          <LobbyView
            client={mockClient}
            matrixInfo={matrixInfo}
            muteStates={muteStates}
            onEnter={() => {}}
            confineToRoom={false}
            hideHeader={false}
            participantCount={3}
            onShareClick={null}
            {...props}
          />
        </TooltipProvider>
      </MediaDevicesContext>
    </BrowserRouter>,
  );
}

describe("LobbyView", () => {
  it("renders with header and participant count", async () => {
    const { container } = renderLobbyView();
    expect(container).toMatchSnapshot();
    expect(
      container.getElementsByClassName(headerStyles.header).length,
    ).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders without header", () => {
    const { container } = renderLobbyView({ hideHeader: true });
    expect(
      container.getElementsByClassName(headerStyles.header).length,
    ).toBeFalsy();
  });

  it("renders with waiting for invite state", () => {
    const { getByTestId } = renderLobbyView({
      waitingForInvite: true,
    });
    expect(getByTestId("lobby_joinCall")).toHaveClass(lobbyStyles.wait);
  });

  it("renders participant avatars when participantUserIds is provided", () => {
    const { container } = renderLobbyView({
      participantUserIds: ["@alice:example.org", "@bob:example.org"],
    });
    expect(container.textContent).toContain("Alice");
    expect(container.textContent).toContain("Bob");
  });

  it("renders overflow badge when more than 5 participants", () => {
    const { container } = renderLobbyView({
      participantUserIds: [
        "@alice:example.org",
        "@bob:example.org",
        "@charlie:example.org",
        "@dave:example.org",
        "@eve:example.org",
        "@frank:example.org",
      ],
    });
    expect(container.textContent).toContain("+1");
    expect(container.textContent).toContain("more");
  });
});
