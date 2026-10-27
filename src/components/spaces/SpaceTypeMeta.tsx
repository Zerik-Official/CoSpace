import type { ReactNode } from "react";
import { LuArmchair, LuDoorClosed, LuUsersRound } from "react-icons/lu";

import { SpaceType } from "@/lib/domain/enums";

/** Message key each kind of space is labelled with. */
export const SPACE_TYPE_MESSAGE_KEYS: Record<SpaceType, string> = {
  [SpaceType.DESK]: "DESK",
  [SpaceType.MEETING_ROOM]: "MEETING_ROOM",
  [SpaceType.CABIN]: "CABIN",
};

/**
 * Returns the icon that represents a kind of space.
 *
 * @param type - Kind of space.
 * @param className - Classes applied to the icon.
 * @returns The rendered icon.
 */
export function spaceTypeIcon(type: SpaceType, className?: string): ReactNode {
  if (type === SpaceType.MEETING_ROOM) {
    return <LuUsersRound className={className} aria-hidden />;
  }

  if (type === SpaceType.CABIN) {
    return <LuDoorClosed className={className} aria-hidden />;
  }

  return <LuArmchair className={className} aria-hidden />;
}
