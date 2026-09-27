import Link from "next/link";
import { MessagePage } from "@/components/layout/message-page";
import { Button } from "@/components/ui/button";
import { ROOM_ERROR_COPY } from "@/lib/room-errors";
import { DASHBOARD_PATH } from "@/lib/routes";

// The same page for a missing room and for one the visitor isn't a member of (Invariant 2), in the same
// words the room shows when a ticket is refused.
const { title, body } = ROOM_ERROR_COPY.not_found;

export default function RoomNotFound() {
  return (
    <MessagePage
      title={title}
      actions={
        <Button asChild>
          <Link href={DASHBOARD_PATH}>Back to your rooms</Link>
        </Button>
      }
    >
      <p>{body}</p>
    </MessagePage>
  );
}
