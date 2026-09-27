"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { resetInviteLink } from "@/actions/invite";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ShareRoomButtonProps {
  roomId: string;
  /** The room's invite link. Only the owner's page renders this button (ADR 0003). */
  initialInviteUrl: string;
}

async function copyInviteUrl(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  } catch {
    // Insecure origin or a refused permission: the dialog shows the link for a manual copy.
    toast.error("Couldn't copy — select the link and copy it");
  }
}

export function ShareRoomButton({ roomId, initialInviteUrl }: ShareRoomButtonProps) {
  const [inviteUrl, setInviteUrl] = useState(initialInviteUrl);
  const [pending, startTransition] = useTransition();

  function handleReset() {
    startTransition(async () => {
      const result = await resetInviteLink(roomId);
      if (result.success) {
        setInviteUrl(result.data.inviteUrl);
        toast.success("New invite link created");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {/* Copies inside the click itself: Safari refuses clipboard writes after an awaited request. */}
        <Button size="sm" variant="outline" onClick={() => copyInviteUrl(inviteUrl)}>
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this room</DialogTitle>
          <DialogDescription>
            Anyone signed in who opens this link can join and edit. Keep it private.
          </DialogDescription>
        </DialogHeader>
        <Input
          readOnly
          value={inviteUrl}
          aria-label="Invite link"
          onFocus={(event) => event.currentTarget.select()}
        />
        <DialogFooter>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={pending}>
                Reset link
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset the invite link?</AlertDialogTitle>
                <AlertDialogDescription>
                  The old link stops working. People who already joined keep access.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={() => copyInviteUrl(inviteUrl)}>Copy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
