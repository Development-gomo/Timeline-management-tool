import { useEffect, useMemo, useState } from "react";

const inputClass =
  "form-field w-full rounded-[8px] border border-[#c5d0de] bg-white px-[14px] py-3 text-sm text-[#070c11] outline-none transition focus:border-[rgba(23,178,106,0.5)] focus:shadow-[0_0_0_4px_rgba(23,178,106,0.08)]";

function StatCard({ label, value, hint, accentClass }) {
  return (
    <article
      className={`relative overflow-hidden rounded-[8px] border border-[#d7dfeb] bg-white px-5 py-[18px] shadow-[0_8px_24px_rgba(16,24,40,0.06)] before:absolute before:inset-x-0 before:top-0 before:h-1 before:content-[''] ${accentClass}`}
    >
      <p className="mb-3.5 text-sm font-bold text-[#475467]">{label}</p>
      <strong className="mb-1 block font-Merriweather text-[36px] leading-none font-bold text-[#070c11]">
        {value}
      </strong>
      <span className="text-sm text-[#667085]">{hint}</span>
    </article>
  );
}

function formatLogTimestamp(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function displayAuditValue(value) {
  return value || "Empty";
}

function summarizeLogDetails(log) {
  const historyEntries = Array.isArray(log.history) ? log.history : [];
  const detailEntries = historyEntries.flatMap((historyItem) =>
    Array.isArray(historyItem.detailsEntries) ? historyItem.detailsEntries : []
  );

  if (!detailEntries.length) {
    return log.details || "No detailed change summary available.";
  }

  const summaryItems = detailEntries
    .slice(0, 3)
    .map((entry) => {
      if (entry.field === "Summary") {
        return `${displayAuditValue(entry.from)} -> ${displayAuditValue(entry.to)}`;
      }

      return `${entry.field}: ${displayAuditValue(entry.from)} -> ${displayAuditValue(entry.to)}`;
    });

  const remainingCount = detailEntries.length - summaryItems.length;
  return remainingCount > 0
    ? `${summaryItems.join(" | ")} | +${remainingCount} more change${remainingCount > 1 ? "s" : ""}`
    : summaryItems.join(" | ");
}

function getPrimaryLogDetail(log) {
  const historyEntries = Array.isArray(log.history) ? log.history : [];
  const detailEntries = historyEntries.flatMap((historyItem) =>
    Array.isArray(historyItem.detailsEntries) ? historyItem.detailsEntries : []
  );

  const primaryEntry = detailEntries[0];
  return {
    entry: primaryEntry || null,
    remainingCount: Math.max(0, detailEntries.length - 1),
  };
}

function buildLogTooltip(log, resolvedUserName) {
  const primaryDetail = getPrimaryLogDetail(log);

  return [
    `Project: ${log.projectName || "Workspace"}`,
    `Category: ${log.actionLabel || "Activity"}`,
    `Task: ${primaryDetail.entry?.task || "No task detail"}`,
    `Field: ${primaryDetail.entry?.field || "Summary"}`,
    `From: ${displayAuditValue(primaryDetail.entry?.from || log.details)}`,
    `To: ${displayAuditValue(primaryDetail.entry?.to || "Updated")}`,
    `Owner: ${resolvedUserName}`,
    `Date: ${formatLogTimestamp(log.createdAt)}`,
  ].join("\n");
}

function LogsPage({
  logs,
  projects,
  appUsers = [],
  teamMembers,
  isSuperAdmin = false,
  onDeleteLog,
}) {
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [hoveredTooltip, setHoveredTooltip] = useState(null);

  const resetFilters = () => {
    setSelectedUser("all");
    setSelectedProject("all");
    setSelectedAction("all");
    setSelectedStartDate("");
    setSelectedEndDate("");
  };

  const showTooltip = (event, content) => {
    setHoveredTooltip({
      content,
      x: event.clientX + 16,
      y: event.clientY + 16,
    });
  };

  const moveTooltip = (event) => {
    setHoveredTooltip((current) =>
      current
        ? {
            ...current,
            x: event.clientX + 16,
            y: event.clientY + 16,
          }
        : current
    );
  };

  const hideTooltip = () => {
    setHoveredTooltip(null);
  };

  const desktopGridClass = isSuperAdmin
    ? "grid-cols-[142px_180px_208px_140px_minmax(0,1fr)_minmax(0,1fr)_160px_170px_74px]"
    : "grid-cols-[142px_180px_208px_140px_minmax(0,1fr)_minmax(0,1fr)_160px_170px]";

  useEffect(() => {
    if (!selectedLog) {
      return undefined;
    }

    const handleEscapeClose = (event) => {
      if (event.key === "Escape") {
        setSelectedLog(null);
      }
    };

    document.addEventListener("keydown", handleEscapeClose);
    return () => document.removeEventListener("keydown", handleEscapeClose);
  }, [selectedLog]);

  const userDirectory = useMemo(() => {
    const mapped = new Map();
    appUsers.forEach((user) => {
      if (user.email) {
        mapped.set(user.email.toLowerCase(), user.name || user.email);
      }
    });
    teamMembers.forEach((member) => {
      if (member.email && !mapped.has(member.email.toLowerCase())) {
        mapped.set(member.email.toLowerCase(), member.name || member.email);
      }
    });
    return mapped;
  }, [appUsers, teamMembers]);

  const resolveUserName = (log) =>
    userDirectory.get(String(log.userEmail || "").toLowerCase()) ||
    log.userName ||
    log.userEmail ||
    "Unknown user";

  const userOptions = useMemo(() => {
    const mapped = new Map();
    logs.forEach((log) => {
      const userEmail = String(log.userEmail || "").trim();
      if (!userEmail) {
        return;
      }
      mapped.set(userEmail, resolveUserName(log));
    });

    return Array.from(mapped.entries())
      .map(([email, name]) => ({ email, name }))
      .sort((leftUser, rightUser) => leftUser.name.localeCompare(rightUser.name));
  }, [logs, userDirectory]);
  const projectOptions = useMemo(() => {
    const mapped = new Map();
    projects.forEach((project) => mapped.set(project.id, project.name));
    logs.forEach((log) => {
      if (log.projectId && log.projectName && !mapped.has(log.projectId)) {
        mapped.set(log.projectId, log.projectName);
      }
    });
    return Array.from(mapped.entries()).map(([id, name]) => ({ id, name }));
  }, [logs, projects]);
  const actionOptions = useMemo(
    () =>
      Array.from(new Set(logs.map((log) => log.actionLabel).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [logs]
  );

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        if (selectedUser !== "all" && log.userEmail !== selectedUser) {
          return false;
        }
        if (selectedProject !== "all" && log.projectId !== selectedProject) {
          return false;
        }
        if (selectedAction !== "all" && log.actionLabel !== selectedAction) {
          return false;
        }
        const logDate = String(log.createdAt || "").slice(0, 10);
        if (selectedStartDate && logDate < selectedStartDate) {
          return false;
        }
        if (selectedEndDate && logDate > selectedEndDate) {
          return false;
        }
        return true;
      }),
    [logs, selectedAction, selectedEndDate, selectedProject, selectedStartDate, selectedUser]
  );

  const todayLogCount = logs.filter((log) =>
    String(log.createdAt || "").startsWith(new Date().toISOString().slice(0, 10))
  ).length;

  return (
    <div>
      <section className="mb-[18px] grid grid-cols-1 gap-4 xl:grid-cols-4">
        <StatCard
          label="Total Log Entries"
          value={logs.length}
          hint="All stored activity in the workspace"
          accentClass="before:bg-[#2e90fa]"
        />
        <StatCard
          label="Filtered Results"
          value={filteredLogs.length}
          hint="Logs matching your current filters"
          accentClass="before:bg-[#17b26a]"
        />
        <StatCard
          label="Users Captured"
          value={userOptions.length}
          hint="People recorded in the audit trail"
          accentClass="before:bg-[#f79009]"
        />
        <StatCard
          label="Today’s Activity"
          value={todayLogCount}
          hint="Entries created today"
          accentClass="before:bg-[#f04438]"
        />
      </section>

      <section className="mb-[18px] rounded-[8px] border border-[#d7dfeb] bg-white p-[16px] shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid w-full grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_180px_180px_auto]">
            <select
              className={`app-select ${inputClass}`}
              value={selectedUser}
              onChange={(event) => setSelectedUser(event.target.value)}
            >
              <option value="all">All users</option>
              {userOptions.map((user) => (
                <option key={user.email} value={user.email}>
                  {user.name}
                </option>
              ))}
            </select>

            <select
              className={`app-select ${inputClass}`}
              value={selectedProject}
              onChange={(event) => setSelectedProject(event.target.value)}
            >
              <option value="all">All projects</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <select
              className={`app-select ${inputClass}`}
              value={selectedAction}
              onChange={(event) => setSelectedAction(event.target.value)}
            >
              <option value="all">All activity types</option>
              {actionOptions.map((actionLabel) => (
                <option key={actionLabel} value={actionLabel}>
                  {actionLabel}
                </option>
              ))}
            </select>

            <input
              className={inputClass}
              type="date"
              value={selectedStartDate}
              onChange={(event) => setSelectedStartDate(event.target.value)}
            />

            <input
              className={inputClass}
              type="date"
              value={selectedEndDate}
              onChange={(event) => setSelectedEndDate(event.target.value)}
            />

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-[8px] border border-[#c5d0de] bg-white px-4 py-3 text-sm font-bold text-[#344054] transition duration-200 hover:-translate-y-px"
              onClick={resetFilters}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[8px] border border-[#d7dfeb] bg-white shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
        <div className="grid gap-3">
          {filteredLogs.length ? (
            <>
              <div className="hidden xl:block">
                <div className={`grid ${desktopGridClass} gap-0 rounded-t-[8px] bg-white px-0`}>
                  {[
                    "Project",
                    "Category",
                    "Task",
                    "Field",
                    "From",
                    "To",
                    "Owner",
                    "Date",
                    ...(isSuperAdmin ? ["Action"] : []),
                  ].map((heading) => (
                    <div
                      key={heading}
                      className={`border-b border-[#d7dfeb] px-4 py-4 text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#667085] ${
                        heading === "Action" ? "text-center" : "text-left"
                      }`}
                    >
                      {heading}
                    </div>
                  ))}
                </div>

                <div className="divide-y divide-[#d7dfeb]">
                  {filteredLogs.map((log, index) => {
                    const primaryDetail = getPrimaryLogDetail(log);
                    const tooltipText = buildLogTooltip(log, resolveUserName(log));

                    return (
                    <div
                      key={log.id}
                      className={[
                        `grid ${desktopGridClass} gap-0 px-0 transition duration-200 hover:bg-[#f8fafc]`,
                        index % 2 === 1 ? "bg-[#fcfdff]" : "bg-white",
                      ].join(" ")}
                      onMouseEnter={(event) => showTooltip(event, tooltipText)}
                      onMouseMove={moveTooltip}
                      onMouseLeave={hideTooltip}
                    >
                      <div className="flex items-center px-4 py-2 text-[14px] font-bold text-[#070c11]">
                        <span className="truncate">{log.projectName || "Workspace"}</span>
                      </div>
                      <div className="flex items-center px-4 py-2 text-[14px] font-bold text-[#070c11]">
                        <span className="truncate">{log.actionLabel}</span>
                      </div>
                      <div className="flex items-center px-4 py-2 text-[14px] text-[#475467]">
                        <div className="min-w-0">
                          <div className="truncate">
                            {primaryDetail.entry?.task || "No task detail"}
                          </div>
                          {primaryDetail.remainingCount > 0 ? (
                            <div className="mt-1 text-xs font-bold text-[#17b26a]">
                              +{primaryDetail.remainingCount} more change
                              {primaryDetail.remainingCount > 1 ? "s" : ""}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center px-4 py-2 text-[14px] text-[#475467]">
                        <span className="truncate">
                          {primaryDetail.entry?.field || "Summary"}
                        </span>
                      </div>
                      <div className="flex items-center px-4 py-2 text-[14px] text-[#475467]">
                        <span className="truncate">
                          {displayAuditValue(primaryDetail.entry?.from || log.details)}
                        </span>
                      </div>
                      <div className="flex items-center px-4 py-2 text-[14px] text-[#070c11]">
                        <span className="truncate">
                          {displayAuditValue(primaryDetail.entry?.to || "Updated")}
                        </span>
                      </div>
                      <div className="flex items-center px-4 py-2 text-[14px] font-bold text-[#070c11]">
                        <span className="truncate">{resolveUserName(log)}</span>
                      </div>
                      <div className="flex items-center px-4 py-2 text-[14px] text-[#475467]">
                        <span>{formatLogTimestamp(log.createdAt)}</span>
                      </div>
                      {isSuperAdmin ? (
                        <div className="flex items-center justify-center px-3 py-2">
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[rgba(240,68,56,0.24)] bg-white text-[#f04438] transition duration-200 hover:-translate-y-px hover:border-[#f04438] hover:bg-[#fff5f5]"
                            onClick={() => onDeleteLog?.(log.id)}
                            aria-label="Delete log"
                            title="Delete log"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                              <path
                                d="M4 7h16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.9"
                                strokeLinecap="round"
                              />
                              <path
                                d="M9 7V5.8C9 4.81 9.81 4 10.8 4h2.4C14.19 4 15 4.81 15 5.8V7"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.9"
                                strokeLinecap="round"
                              />
                              <path
                                d="M7 7l.8 11.2A2 2 0 0 0 9.79 20h4.42a2 2 0 0 0 1.99-1.8L17 7"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.9"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M10 11v5M14 11v5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.9"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )})}
                </div>
              </div>

              <div className="grid gap-3 p-[16px] xl:hidden">
                {filteredLogs.map((log) => {
                  const primaryDetail = getPrimaryLogDetail(log);
                  const tooltipText = buildLogTooltip(log, resolveUserName(log));
                  return (
                  <article
                    key={log.id}
                    className="grid gap-3 rounded-[8px] border border-[#d7dfeb] bg-[#fcfdff] p-[16px]"
                    onMouseEnter={(event) => showTooltip(event, tooltipText)}
                    onMouseMove={moveTooltip}
                    onMouseLeave={hideTooltip}
                  >
                    <div className="grid gap-2">
                      <div className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#667085]">
                        Project
                      </div>
                      <div className="text-[14px] font-bold text-[#070c11]">
                        {log.projectName || "Workspace"}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <div className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#667085]">
                        Category
                      </div>
                      <div className="text-[14px] font-bold text-[#070c11]">
                        {log.actionLabel}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <div className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#667085]">
                        Task
                      </div>
                      <div className="text-[14px] text-[#475467]">
                        {primaryDetail.entry?.task || "No task detail"}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <div className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#667085]">
                        Field
                      </div>
                      <div className="text-[14px] text-[#475467]">
                        {primaryDetail.entry?.field || "Summary"}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <div className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#667085]">
                        From
                      </div>
                      <div className="text-[14px] text-[#475467]">
                        {displayAuditValue(primaryDetail.entry?.from || log.details)}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <div className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#667085]">
                        To
                      </div>
                      <div className="text-[14px] text-[#070c11]">
                        {displayAuditValue(primaryDetail.entry?.to || "Updated")}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <div className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#667085]">
                        Owner
                      </div>
                      <div className="text-[14px] font-bold text-[#070c11]">
                        {resolveUserName(log)}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <div className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#667085]">
                        Date
                      </div>
                      <div className="text-[14px] text-[#475467]">
                        {formatLogTimestamp(log.createdAt)}
                      </div>
                    </div>
                    {isSuperAdmin ? (
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[rgba(240,68,56,0.24)] bg-white text-[#f04438] transition duration-200 hover:-translate-y-px hover:border-[#f04438] hover:bg-[#fff5f5]"
                          onClick={() => onDeleteLog?.(log.id)}
                          aria-label="Delete log"
                          title="Delete log"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                            <path
                              d="M4 7h16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.9"
                              strokeLinecap="round"
                            />
                            <path
                              d="M9 7V5.8C9 4.81 9.81 4 10.8 4h2.4C14.19 4 15 4.81 15 5.8V7"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.9"
                              strokeLinecap="round"
                            />
                            <path
                              d="M7 7l.8 11.2A2 2 0 0 0 9.79 20h4.42a2 2 0 0 0 1.99-1.8L17 7"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.9"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M10 11v5M14 11v5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.9"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : null}
                    {primaryDetail.remainingCount > 0 || log.repeatCount > 1 ? (
                      <div className="text-xs font-bold text-[#17b26a]">
                        {primaryDetail.remainingCount > 0
                          ? `+${primaryDetail.remainingCount} more change${primaryDetail.remainingCount > 1 ? "s" : ""}`
                          : null}
                        {primaryDetail.remainingCount > 0 && log.repeatCount > 1 ? " · " : ""}
                        {log.repeatCount > 1
                          ? `Updated ${log.repeatCount} times`
                          : null}
                      </div>
                    ) : null}
                  </article>
                )})}
              </div>
            </>
          ) : (
            <div className="m-[16px] rounded-[8px] border border-dashed border-[#c5d0de] bg-[#fbfcfe] p-[16px] text-[#667085]">
              No log entries match the current filters.
            </div>
          )}
        </div>
      </section>

      {selectedLog ? (
        <div
          className="fixed inset-0 z-[3000] flex items-center justify-center bg-[rgba(7,12,17,0.22)] px-4 py-6"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-[980px] overflow-y-auto rounded-[8px] bg-white shadow-[0_24px_64px_rgba(16,24,40,0.24)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#d7dfeb] px-6 py-4">
              <div>
                <h3 className="m-0 text-[18px] leading-[1.25] font-bold text-[#070c11]">
                  {selectedLog.actionLabel}
                </h3>
                <p className="mt-1 text-sm text-[#667085]">
                  {selectedLog.projectName || "Workspace"} · {resolveUserName(selectedLog)} ·{" "}
                  {formatLogTimestamp(selectedLog.createdAt)}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#d7dfeb] bg-white text-[#475467] transition duration-200 hover:-translate-y-px"
                onClick={() => setSelectedLog(null)}
                aria-label="Close log details"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                  <path
                    d="M6 6 18 18M18 6 6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="grid gap-4 px-6 py-5">
              {(selectedLog.history || []).length ? (
                selectedLog.history.map((historyItem, historyIndex) => (
                  <section
                    key={historyItem.id || `${selectedLog.id}-${historyIndex}`}
                    className="rounded-[8px] border border-[#d7dfeb] bg-[#fcfdff] p-[16px]"
                  >
                    <div className="mb-3 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                      <div className="text-sm font-bold text-[#070c11]">
                        {historyItem.summary || "Detailed change log"}
                      </div>
                      <div className="text-sm text-[#667085]">
                        {formatLogTimestamp(historyItem.changedAt || selectedLog.createdAt)}
                      </div>
                    </div>

                    {historyItem.detailsEntries?.length ? (
                      <div className="overflow-hidden rounded-[8px] border border-[#d7dfeb] bg-white">
                        <div className="grid grid-cols-[190px_160px_minmax(0,1fr)_minmax(0,1fr)] border-b border-[#d7dfeb] bg-[#f8fafc]">
                          {["Task", "Field", "From", "To"].map((heading) => (
                            <div
                              key={heading}
                              className="px-4 py-3 text-left text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#667085]"
                            >
                              {heading}
                            </div>
                          ))}
                        </div>
                        <div className="divide-y divide-[#d7dfeb]">
                          {historyItem.detailsEntries.map((entry, entryIndex) => (
                            <div
                              key={`${historyItem.id || historyIndex}-${entryIndex}`}
                              className="grid grid-cols-[190px_160px_minmax(0,1fr)_minmax(0,1fr)]"
                            >
                              <div className="px-4 py-3 text-[14px] font-bold text-[#070c11]">
                                {entry.task}
                              </div>
                              <div className="px-4 py-3 text-[14px] text-[#475467]">
                                {entry.field}
                              </div>
                              <div className="px-4 py-3 text-[14px] text-[#475467]">
                                {displayAuditValue(entry.from)}
                              </div>
                              <div className="px-4 py-3 text-[14px] text-[#070c11]">
                                {displayAuditValue(entry.to)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-[#667085]">
                        No field-level detail was stored for this log entry.
                      </div>
                    )}
                  </section>
                ))
              ) : (
                <div className="rounded-[8px] border border-[#d7dfeb] bg-[#fcfdff] p-[16px] text-sm text-[#667085]">
                  No detailed history is available for this log entry.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {hoveredTooltip ? (
        <div
          className="pointer-events-none fixed z-[3100] max-w-[360px] whitespace-pre-line rounded-[8px] border border-[#d7dfeb] bg-[#070c11] px-3 py-2 text-xs leading-[1.5] text-white shadow-[0_16px_32px_rgba(16,24,40,0.22)]"
          style={{
            left: hoveredTooltip.x,
            top: hoveredTooltip.y,
          }}
        >
          {hoveredTooltip.content}
        </div>
      ) : null}
    </div>
  );
}

export default LogsPage;
