export const TASK_STATUS_OPTIONS = [
  { value: "ongoing", label: "Ongoing" },
  { value: "done", label: "Done" },
  { value: "onhold", label: "Onhold" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
  { value: "failed", label: "Failed" },
  { value: "na", label: "N/A" },
];

export const OWNER_ROLE_OPTIONS = [
  { value: "Developer", label: "Developer" },
  { value: "Designer", label: "Designer" },
  { value: "CSM/Project manager", label: "CSM/Project manager" },
  { value: "Client", label: "Client" },
  { value: "SEO Analyst", label: "SEO Analyst" },
];

export const TASK_STATUS_LABELS = Object.fromEntries(
  TASK_STATUS_OPTIONS.map((option) => [option.value, option.label])
);

export function parseDateString(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.includes("T") ? value.slice(0, 10) : value;
  const match = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const nextDate = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
}

export function formatDateString(value) {
  const date = parseDateString(value);
  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(value) {
  const date = parseDateString(value);
  if (!date) {
    return "";
  }

  const day = `${date.getDate()}`.padStart(2, "0");
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function addDays(value, days) {
  const date = parseDateString(value);
  if (!date) {
    return "";
  }

  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return formatDateString(nextDate);
}

export function diffInDaysInclusive(startDate, endDate) {
  const start = parseDateString(startDate);
  const end = parseDateString(endDate);
  if (!start || !end) {
    return 1;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((end - start) / millisecondsPerDay) + 1);
}

export function progressFromStatus(status, fallbackProgress = 0) {
  if (status === "done") {
    return 1;
  }
  if (status === "ongoing") {
    return Math.max(0.4, Number(fallbackProgress) || 0.5);
  }
  if (status === "cancelled" || status === "failed" || status === "na") {
    return 0;
  }
  return Number(fallbackProgress) || 0;
}

export function normalizeStoredTask(task) {
  const startDate = formatDateString(task.start_date);
  const endDate = formatDateString(task.end_date);
  const duration =
    startDate && endDate
      ? diffInDaysInclusive(startDate, endDate)
      : Math.max(1, Number(task.duration) || 1);
  const ownerIds = Array.isArray(task.ownerIds)
    ? task.ownerIds.filter(Boolean)
    : task.assigneeId
      ? [task.assigneeId]
      : [];
  const isPhaseRow = Boolean(task.isPhase);
  const status = task.status || (isPhaseRow ? "na" : "pending");

  return {
    ...task,
    taskType: task.taskType || (isPhaseRow ? "Phase" : "General"),
    text: task.text || "",
    ownerRole: task.ownerRole || "",
    ownerIds,
    start_date: startDate,
    end_date: endDate,
    duration,
    status,
    progress: progressFromStatus(status, task.progress),
    open: task.open !== false,
    unscheduled: !(startDate && endDate),
  };
}

export function toGanttTask(task) {
  const normalizedTask = normalizeStoredTask(task);
  const startDate = normalizedTask.start_date;
  const endDate = normalizedTask.end_date;
  const ganttEndDate = endDate ? addDays(endDate, 1) : "";

  return {
    ...normalizedTask,
    start_date: parseDateString(startDate),
    end_date: parseDateString(ganttEndDate),
    duration: normalizedTask.duration,
    unscheduled: !(startDate && endDate),
  };
}

export function fromGanttTask(task) {
  const { assigneeId, ...restTask } = task;
  const startDate = formatDateString(task.start_date);
  const endDate = formatDateString(task.end_date);
  const storedEndDate = endDate ? addDays(endDate, -1) : "";
  const duration =
    startDate && storedEndDate
      ? diffInDaysInclusive(startDate, storedEndDate)
      : Math.max(1, Number(task.duration) || 1);
  const ownerIds = Array.isArray(task.ownerIds)
    ? task.ownerIds.filter(Boolean)
    : task.assigneeId
      ? [task.assigneeId]
      : [];
  const status = task.status || (task.isPhase ? "na" : "pending");

  return {
    ...restTask,
    taskType: task.taskType || (task.isPhase ? "Phase" : "General"),
    text: task.text || "",
    ownerRole: task.ownerRole || "",
    ownerIds,
    start_date: startDate,
    end_date: storedEndDate,
    duration,
    status,
    progress: progressFromStatus(status, task.progress),
    unscheduled: !(startDate && storedEndDate),
  };
}

export function getOwnerLabel(task, members = []) {
  const selectedOwners = (task.ownerIds || [])
    .map((ownerId) => members.find((member) => member.id === ownerId)?.name)
    .filter(Boolean);

  if (selectedOwners.length) {
    return selectedOwners.join(", ");
  }

  return task.ownerRole || "Unassigned";
}
