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

function getTimelineNotificationCandidates(projects, today, managerEmail) {
  const candidates = [];

  projects.forEach((project) => {
    const tasks = Array.isArray(project.timeline?.data) ? project.timeline.data : [];
    const dueSoonTasks = [];
    const overdueTasks = [];
    const overdueOwnerEmails = new Set();

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
        daysOverdue: Math.max(0, -daysUntilDue),
      };

      if (daysUntilDue === 5) {
        dueSoonTasks.push(taskDetails);
      } else if (daysUntilDue < 0) {
        overdueTasks.push(taskDetails);
        getTaskOwnerEmails(project, task).forEach((email) =>
          overdueOwnerEmails.add(email)
        );
      }
    });

    if (dueSoonTasks.length) {
      candidates.push({
        project,
        type: "due-soon",
        tasks: dueSoonTasks,
        recipients: [managerEmail],
      });
    }

    if (overdueTasks.length) {
      candidates.push({
        project,
        type: "overdue",
        tasks: overdueTasks,
        recipients: [...new Set([...overdueOwnerEmails, managerEmail])],
      });
    }
  });

  return candidates;
}

export {
  getIstDateString,
  getTimelineNotificationCandidates,
};
