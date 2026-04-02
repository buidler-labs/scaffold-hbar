"use client";

import React from "react";
import { BaseInput } from "@scaffold-ui/components/Input/BaseInput";
import { proofWallConfig } from "~~/config/proofWallConfig";

type TopicSelectorProps = {
  topicId: string;
  onTopicIdChange?: (topicId: string) => void;
  /** If true, show a simple read-only display instead of a selector (single topic app) */
  readOnly?: boolean;
};

export function TopicSelector({ topicId, onTopicIdChange, readOnly }: TopicSelectorProps) {
  const configuredTopicId = proofWallConfig.topicId;

  if (readOnly || !onTopicIdChange) {
    return (
      <div className="text-sm text-base-content/70">
        Topic: <span className="font-mono">{topicId || configuredTopicId || "—"}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">Topic</span>
      <div className="max-w-xs w-full min-w-[12rem]">
        <BaseInput<string>
          name="proof-wall-topic-id"
          placeholder="0.0.12345"
          value={topicId || configuredTopicId}
          onChange={onTopicIdChange}
        />
      </div>
    </div>
  );
}
