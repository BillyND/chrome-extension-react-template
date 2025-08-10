export function formatRelativeTime(targetDate: Date): string {
  const now = new Date();
  let diffMs = targetDate.getTime() - now.getTime();
  const isPast = diffMs < 0;
  diffMs = Math.abs(diffMs);

  const minutes = Math.floor(diffMs / (1000 * 60)) % 60;
  const hours = Math.floor(diffMs / (1000 * 60 * 60)) % 24;
  const daysTotal = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(daysTotal / 7);
  const days = daysTotal % 7;

  const parts: string[] = [];
  if (weeks) parts.push(`${weeks}w`);
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push("0m");

  return (isPast ? "-" : "+") + parts.join(" ");
}

export function generateJiraUrl(month: number, year: number): string {
  // +1 ngày cho start date
  const startDate = new Date(year, month - 1, 2, 0, 0);
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = new Date(year, month - 1, lastDay, 23, 59);

  const relStart = formatRelativeTime(startDate);
  const relEnd = formatRelativeTime(endDate);

  const assigneePart = `assignee = currentUser()`;

  const baseURL =
    `https://tigren.atlassian.net/issues/?filter=20628&jql=` +
    `${assigneePart} ` +
    `AND status IN ("QA Review", Done, "Leader Review") ` +
    `AND due >= "${relStart}" ` +
    `AND due <= "${relEnd}" ` +
    `ORDER BY created DESC`;

  return baseURL;
}

export const MONTHS = [
  { value: 1, label: "Tháng 1" },
  { value: 2, label: "Tháng 2" },
  { value: 3, label: "Tháng 3" },
  { value: 4, label: "Tháng 4" },
  { value: 5, label: "Tháng 5" },
  { value: 6, label: "Tháng 6" },
  { value: 7, label: "Tháng 7" },
  { value: 8, label: "Tháng 8" },
  { value: 9, label: "Tháng 9" },
  { value: 10, label: "Tháng 10" },
  { value: 11, label: "Tháng 11" },
  { value: 12, label: "Tháng 12" },
];

export function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 2; y <= currentYear + 2; y++) {
    years.push({ value: y, label: y.toString() });
  }
  return years;
}