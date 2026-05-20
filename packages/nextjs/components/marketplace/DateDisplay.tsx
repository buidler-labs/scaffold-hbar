"use client";

import { formatDate, formatRelativeDate } from "~~/utils/hedera";

interface DateDisplayProps {
  timestamp: number | bigint;
  showRelative?: boolean;
  className?: string;
}

export const DateDisplay = ({ timestamp, showRelative = false, className = "" }: DateDisplayProps) => {
  const formatted = formatDate(timestamp);
  const relative = formatRelativeDate(timestamp);

  return (
    <span className={className} title={formatted}>
      {showRelative ? relative : formatted}
    </span>
  );
};

interface DateRangeDisplayProps {
  start: number | bigint;
  end: number | bigint;
  className?: string;
}

export const DateRangeDisplay = ({ start, end, className = "" }: DateRangeDisplayProps) => {
  return (
    <span className={className}>
      <DateDisplay timestamp={start} /> - <DateDisplay timestamp={end} />
    </span>
  );
};
