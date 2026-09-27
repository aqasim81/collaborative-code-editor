import Link from "next/link";
import { MessagePage } from "@/components/layout/message-page";
import { Button } from "@/components/ui/button";
import { DASHBOARD_PATH } from "@/lib/routes";

export default function NotFound() {
  return (
    <MessagePage
      title="Page not found"
      actions={
        <>
          <Button asChild>
            <Link href="/">Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={DASHBOARD_PATH}>Your rooms</Link>
          </Button>
        </>
      }
    >
      <p>There's nothing at this address. It may have moved, or the link may be mistyped.</p>
    </MessagePage>
  );
}
