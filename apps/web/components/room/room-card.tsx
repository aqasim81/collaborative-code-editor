import type { RoomRole } from "@prisma/client";
import Link from "next/link";
import { DeleteRoomButton } from "@/components/room/delete-room-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { languageLabel } from "@/lib/languages";
import type { RoomSummary } from "@/lib/rooms";
import { roomPath } from "@/lib/routes";

const ROLE_LABELS: Record<RoomRole, string> = { OWNER: "Owner", EDITOR: "Editor" };

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export function RoomCard({ room }: { room: RoomSummary }) {
  // Only offered to owners; the delete action enforces the same rule on the server.
  const isOwner = room.role === "OWNER";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="truncate">
          <Link href={roomPath(room.id)} className="hover:underline">
            {room.name}
          </Link>
        </CardTitle>
        <CardDescription>{languageLabel(room.language)}</CardDescription>
        <CardAction>
          <Badge variant={isOwner ? "default" : "secondary"}>{ROLE_LABELS[room.role]}</Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="justify-between gap-2 border-t py-3 text-muted-foreground">
        <span>
          Created{" "}
          <time dateTime={room.createdAt.toISOString()}>{dateFormat.format(room.createdAt)}</time>
        </span>
        {isOwner && <DeleteRoomButton roomId={room.id} roomName={room.name} />}
      </CardFooter>
    </Card>
  );
}
