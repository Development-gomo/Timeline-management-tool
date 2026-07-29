const ACTIVE_NOTIFICATION_STATUSES = new Set(["ongoing", "pending"]);
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function getIstDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getCalendarDayDifference(fromDate, toDate) {
  const fromTime = Date.parse(`${fromDate}T00:00:00Z`);
  const toTime = Date.parse(`${toDate}T00:00:00Z`);

  if (Number.isNaN(fromTime) || Number.isNaN(toTime)) {
    return null;
  }

  return Math.round((toTime - fromTime) / MILLISECONDS_PER_DAY);
}

function getTaskOwnerEmails(project, task) {
  const ownerIds = new Set((task.ownerIds || []).map(String));
  return (project.teamMembers || [])
    .filter((member) => ownerIds.has(String(member.id)))
    .map((member) => String(member.email || "").trim().toLowerCase())
    .filter((email) => email.includes("@"));
}

function getTaskOwnerNames(project, task) {
  const ownerIds = new Set((task.ownerIds || []).map(String));
  const ownerNames = (project.teamMembers || [])
    .filter((member) => ownerIds.has(String(member.id)))
    .map((member) => String(member.name || "").trim())
    .filter(Boolean);

  if (ownerNames.length) {
    return ownerNames;
  }

  return [String(task.ownerRole || "Unassigned").trim() || "Unassigned"];
}

function isDueSoonNotificationDay(today, daysUntilDue) {
  const dayOfWeek = new Date(`${today}T00:00:00Z`).getUTCDay();
  return daysUntilDue === 5 || (dayOfWeek === 5 && [6, 7].includes(daysUntilDue));
}

function getTimelineNotificationCandidates(projects, today, managerEmail) {
  const candidates = [];

  projects.forEach((project) => {
    const tasks = Array.isArray(project.timeline?.data) ? project.timeline.data : [];
    const dueSoonTasks = [];
    const overdueTasks = [];
    const dueSoonTasksByOwner = new Map();
    const overdueTasksByOwner = new Map();

    const addTaskForOwners = (ownerMap, task, taskDetails) => {
      getTaskOwnerEmails(project, task).forEach((email) => {
        const ownerTasks = ownerMap.get(email) || [];
        ownerTasks.push(taskDetails);
        ownerMap.set(email, ownerTasks);
      });
    };

    tasks.forEach((task) => {
      const status = String(task.status || "pending").toLowerCase();
      const daysUntilDue = getCalendarDayDifference(today, task.end_date);

      if (
        task.isPhase ||
        daysUntilDue === null ||
        !ACTIVE_NOTIFICATION_STATUSES.has(status)
      ) {
        return;
      }

      const taskDetails = {
        id: task.id,
        name: task.text || "Untitled task",
        dueDate: task.end_date,
        status,
        ownerNames: getTaskOwnerNames(project, task),
        daysOverdue: Math.max(0, -daysUntilDue),
      };

      if (isDueSoonNotificationDay(today, daysUntilDue)) {
        dueSoonTasks.push(taskDetails);
        addTaskForOwners(dueSoonTasksByOwner, task, taskDetails);
      } else if (daysUntilDue < 0) {
        overdueTasks.push(taskDetails);
        addTaskForOwners(overdueTasksByOwner, task, taskDetails);
      }
    });

    if (dueSoonTasks.length) {
      candidates.push({
        project,
        type: "due-soon",
        audienceKey: "manager",
        tasks: dueSoonTasks,
        recipients: [managerEmail],
      });

      dueSoonTasksByOwner.forEach((ownerTasks, ownerEmail) => {
        if (ownerEmail !== managerEmail) {
          candidates.push({
            project,
            type: "due-soon",
            audienceKey: `owner-${ownerEmail}`,
            tasks: ownerTasks,
            recipients: [ownerEmail],
          });
        }
      });
    }

    if (overdueTasks.length) {
      candidates.push({
        project,
        type: "overdue",
        audienceKey: "manager",
        tasks: overdueTasks,
        recipients: [managerEmail],
      });

      overdueTasksByOwner.forEach((ownerTasks, ownerEmail) => {
        if (ownerEmail !== managerEmail) {
          candidates.push({
            project,
            type: "overdue",
            audienceKey: `owner-${ownerEmail}`,
            tasks: ownerTasks,
            recipients: [ownerEmail],
          });
        }
      });
    }
  });

  return candidates;
}

export {
  getIstDateString,
  getTimelineNotificationCandidates,
};
