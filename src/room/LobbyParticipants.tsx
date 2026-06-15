import { type FC, useMemo } from "react";
import { type MatrixClient } from "matrix-js-sdk";
import { Avatar } from "../Avatar";

import styles from "./LobbyParticipants.module.css";

interface Props {
  client: MatrixClient;
  roomId: string;
  userIds: string[];
}

const MAX_VISIBLE = 5;

export const LobbyParticipants: FC<Props> = ({ client, roomId, userIds }) => {
  const userIdsKey = useMemo(() => userIds.join(","), [userIds]);

  const participants = useMemo(() => {
    const room = client.getRoom(roomId);
    return userIds.slice(0, MAX_VISIBLE).map((userId) => {
      const member = room?.getMember(userId);
      return {
        userId,
        name: member?.name || member?.rawDisplayName || userId,
        avatarUrl: member?.getMxcAvatarUrl() ?? undefined,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, roomId, userIdsKey]);

  const remaining = Math.max(0, userIds.length - MAX_VISIBLE);

  if (userIds.length === 0) return null;

  return (
    <div className={styles.participants}>
      {participants.map((p) => (
        <div key={p.userId} className={styles.participant}>
          <Avatar id={p.userId} name={p.name} src={p.avatarUrl} />
          <span className={styles.name}>{p.name.split(" ")[0]}</span>
        </div>
      ))}
      {remaining > 0 && (
        <div className={styles.participant}>
          <div className={styles.overflowBadge}>+{remaining}</div>
          <span className={styles.name}>more</span>
        </div>
      )}
    </div>
  );
};
