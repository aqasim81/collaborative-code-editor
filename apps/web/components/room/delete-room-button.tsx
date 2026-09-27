"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteRoom } from "@/actions/room";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteRoomButtonProps {
  roomId: string;
  roomName: string;
}

export function DeleteRoomButton({ roomId, roomName }: DeleteRoomButtonProps) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    // The action revalidates the dashboard, so the card disappears without a manual refresh.
    startTransition(async () => {
      const result = await deleteRoom(roomId);
      if (result.success) {
        toast.success("Room deleted");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          aria-label={`Delete ${roomName}`}
        >
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {roomName}?</AlertDialogTitle>
          <AlertDialogDescription>This removes the room for every member.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
