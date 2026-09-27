import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listRooms } from "@/actions/room";
import { CreateRoomDialog } from "@/components/room/create-room-dialog";
import { RoomCard } from "@/components/room/room-card";
import { auth } from "@/lib/auth";
import type { Result } from "@/lib/result";
import type { RoomSummary } from "@/lib/rooms";
import { DASHBOARD_PATH, signInRedirect } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Dashboard · Collaborative Code Editor",
};

// Middleware already redirects signed-out visitors; the page checks again so it never
// depends on middleware alone.
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect(signInRedirect(DASHBOARD_PATH));
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Your rooms</h1>
        <CreateRoomDialog />
      </div>
      <RoomList rooms={await listRooms()} />
    </main>
  );
}

function RoomList({ rooms }: { rooms: Result<RoomSummary[]> }) {
  if (!rooms.success) {
    return (
      <p role="alert" className="mt-8 text-destructive">
        {rooms.error}
      </p>
    );
  }
  if (rooms.data.length === 0) {
    return (
      <p className="mt-8 text-muted-foreground">
        No rooms yet — create one to start editing together.
      </p>
    );
  }
  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.data.map((room) => (
        <li key={room.id}>
          <RoomCard room={room} />
        </li>
      ))}
    </ul>
  );
}
