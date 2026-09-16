"use client";

import { useEffect } from "react";
import { markCandidateSeenAction } from "@/app/actions/candidates";

export function MarkCandidateSeen({ candidateId }: { candidateId: string }) {
  useEffect(() => {
    void markCandidateSeenAction(candidateId);
  }, [candidateId]);
  return null;
}
