"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { createRoom } from "@/actions/room";
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
import { Label } from "@/components/ui/label";
import { DEFAULT_LANGUAGE, LANGUAGES } from "@/lib/languages";
import { createRoomSchema, ROOM_NAME_MAX_LENGTH } from "@/lib/room-input";
import { roomPath } from "@/lib/routes";

export function CreateRoomDialog() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // Checked here for a quick answer; the action checks again, since it can't trust the client.
    const parsed = createRoomSchema.safeParse({
      name: form.get("name"),
      language: form.get("language"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid room");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createRoom(parsed.data);
      if (result.success) {
        router.push(roomPath(result.data.id));
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog onOpenChange={() => setError(null)}>
      <DialogTrigger asChild>
        <Button>New room</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New room</DialogTitle>
            <DialogDescription>Name the room and pick its language.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="room-name">Name</Label>
            <Input
              id="room-name"
              name="name"
              maxLength={ROOM_NAME_MAX_LENGTH}
              autoComplete="off"
              aria-invalid={error !== null}
              aria-describedby="create-room-error"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="room-language">Language</Label>
            <select
              id="room-language"
              name="language"
              defaultValue={DEFAULT_LANGUAGE}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
            >
              {LANGUAGES.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.label}
                </option>
              ))}
            </select>
          </div>
          <p id="create-room-error" aria-live="polite" className="min-h-5 text-sm text-destructive">
            {error}
          </p>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
