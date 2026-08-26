"use client";

import { claimTweet, tweetIntentUrl } from "@/lib/tweets";
import type { PlotRecord } from "@/lib/types";
import { formatUsd } from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  plot: PlotRecord;
  onClose: () => void;
};

export function SuccessModal({ plot, onClose }: Props) {
  const text = claimTweet(plot.name);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <Badge variant="success">Territory secured</Badge>
          <DialogTitle>{plot.name} is yours</DialogTitle>
          <DialogDescription>
            You hold it for {formatUsd(plot.currentPriceCents)} until someone pays more.
          </DialogDescription>
        </DialogHeader>
        <p className="px-6 text-muted-foreground text-xs leading-relaxed">{text}</p>
        <DialogFooter variant="bare">
          <Button
            size="lg"
            className="w-full sm:w-full"
            render={<a href={tweetIntentUrl(text)} target="_blank" rel="noreferrer" />}
          >
            Post to X
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Back to the map
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
