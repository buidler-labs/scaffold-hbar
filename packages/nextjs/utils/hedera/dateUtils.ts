export const SECONDS_PER_DAY = 86400;

export const toMidnightUTC = (date: Date): number => {
  return Math.floor(date.getTime() / (SECONDS_PER_DAY * 1000)) * SECONDS_PER_DAY;
};

export const getMidnightUTC = (daysFromNow: number = 0): number => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const todayMidnight = Math.floor(nowSeconds / SECONDS_PER_DAY) * SECONDS_PER_DAY;
  return todayMidnight + daysFromNow * SECONDS_PER_DAY;
};

export const formatDate = (timestamp: number | bigint): string => {
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;

  // Handle invalid/zero timestamps
  if (!ts || ts <= 0 || isNaN(ts)) {
    return "N/A";
  }

  const date = new Date(ts * 1000);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatDateRange = (start: number | bigint, end: number | bigint): string => {
  return `${formatDate(start)} - ${formatDate(end)}`;
};

export const calculateDays = (start: number | bigint, end: number | bigint): number => {
  const startNum = typeof start === "bigint" ? Number(start) : start;
  const endNum = typeof end === "bigint" ? Number(end) : end;
  return Math.ceil((endNum - startNum) / SECONDS_PER_DAY);
};

export const isDateInPast = (timestamp: number | bigint): boolean => {
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  return ts < Math.floor(Date.now() / 1000);
};

export const isDateInFuture = (timestamp: number | bigint): boolean => {
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  return ts > Math.floor(Date.now() / 1000);
};

export const dateToTimestamp = (date: Date): number => {
  return toMidnightUTC(date);
};

export const timestampToDate = (timestamp: number | bigint): Date => {
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  return new Date(ts * 1000);
};

export const formatRelativeDate = (timestamp: number | bigint): string => {
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  const now = Math.floor(Date.now() / 1000);
  const diff = ts - now;
  const days = Math.floor(Math.abs(diff) / SECONDS_PER_DAY);

  if (days === 0) return diff >= 0 ? "Today" : "Today";
  if (days === 1) return diff >= 0 ? "Tomorrow" : "Yesterday";
  if (diff >= 0) return `In ${days} days`;
  return `${days} days ago`;
};
