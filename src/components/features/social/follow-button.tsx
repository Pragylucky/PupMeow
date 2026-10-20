"use client";

import { useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { toggleFollow } from "@/lib/actions/profile";

export function FollowButton({ targetId, initialFollowing }: { targetId: string; initialFollowing: boolean }) {
  const [following, setOptimistic] = useOptimistic(initialFollowing);
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Button
      variant={following ? "outline" : "primary"}
      size="sm"
      aria-pressed={following}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setOptimistic(!following);
          const res = await toggleFollow(targetId, !following);
          if (!res.ok) toast(res.error, "error");
        })
      }
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}

export function UnblockButton({ targetId }: { targetId: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Button
      variant="outline"
      size="sm"
      loading={pending}
      onClick={() => start(async () => {
        const { toggleBlock } = await import("@/lib/actions/profile");
        const res = await toggleBlock(targetId, false);
        toast(res.ok ? res.message ?? "Unblocked" : res.error, res.ok ? "success" : "error");
      })}
    >
      Unblock
    </Button>
  );
}
