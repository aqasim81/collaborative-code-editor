"use client";

import Link from "next/link";
import { MessagePage } from "@/components/layout/message-page";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Next.js passes production errors with the message stripped; the digest matches the server log entry.
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <MessagePage
      title="Something went wrong"
      actions={
        <>
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </>
      }
    >
      <p>This page hit an unexpected error. Trying again usually helps.</p>
      {error.digest ? <p className="mt-2 font-mono text-xs">Reference: {error.digest}</p> : null}
    </MessagePage>
  );
}
