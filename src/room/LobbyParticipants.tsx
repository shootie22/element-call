import { type FC, useMemo } from "react";
import { Avatar } from "../Avatar";

import styles from "./LobbyParticipants.module.css";

export interface LobbyParticipant {
  userId: string;
  name: string;
  avatarUrl?: string;
}

interface Props {
  participants: LobbyParticipant[];
}

const MAX_VISIBLE = 5;

export const LobbyParticipants: FC<Props> = ({ participants }) => {
  const visibleParticipants = useMemo(
    () => participants.slice(0, MAX_VISIBLE),
    [participants],
  );

  const remaining = Math.max(0, participants.length - MAX_VISIBLE);

  if (participants.length === 0) return null;

  return (
    <div className={styles.participants}>
      {visibleParticipants.map((p) => (
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
