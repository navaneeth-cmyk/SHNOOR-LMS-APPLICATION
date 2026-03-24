const NO_TIMEZONE_REGEX = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/;
const IST_OFFSET = "+05:30";

export const parseChatDate = (rawValue) => {
  if (rawValue instanceof Date) return rawValue;
  if (typeof rawValue === "number") return new Date(rawValue);
  if (!rawValue) return new Date();

  const normalized = String(rawValue).trim();
  if (!normalized) return new Date();

  const valueWithTimezone = NO_TIMEZONE_REGEX.test(normalized)
    ? `${normalized.replace(" ", "T")}${IST_OFFSET}`
    : normalized;

  const parsed = new Date(valueWithTimezone);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const formatChatTime = (rawValue) =>
  parseChatDate(rawValue).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

export const formatChatDate = (rawValue) =>
  parseChatDate(rawValue).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const formatChatDateTime = (rawValue) =>
  parseChatDate(rawValue).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
