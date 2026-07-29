import { useMemo, useRef, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import Gantt from "../components/Gantt";
import { findProjectByPublicTimelineId } from "../lib/publicTimeline";
import {
  normalizeStoredTask,
  TASK_STATUS_LABELS,
  TASK_STATUS_OPTIONS,
} from "../lib/timeline";

const statToneClasses = {
  green: "before:bg-[#17b26a]",
  blue: "before:bg-[#2e90fa]",
  amber: "before:bg-[#f79009]",
  red: "before:bg-[#f04438]",
};
const TIMELINE_SHEET_NAME = "Project Timeline";
const TIMELINE_COLUMNS = {
  taskId: "Task ID",
  taskType: "Type of Task",
  description: "Description",
  ownerRole: "Owner / Department",
  assignedMembers: "Assigned Team Members",
  assignedMemberEmails: "Assigned Team Member Emails",
  startDate: "Start Date",
  endDate: "End Date",
  status: "Status",
  dependencies: "Task Dependencies",
  dependencyIds: "Dependency Task IDs",
};
const statusLabelByValue = TASK_STATUS_LABELS;
const statusValueByLabel = Object.fromEntries(
  TASK_STATUS_OPTIONS.map((option) => [option.label.toLowerCase(), option.value])
);
const monthNumberByName = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

function createImportId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeFileName(value) {
  return String(value || "project-timeline")
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function splitCellList(value) {
  return String(value || "")
    .split(/\s*(?:\||;|\n|,)\s*/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeLookupText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function incrementCount(map, key) {
  if (!key) {
    return;
  }

  map.set(key, (map.get(key) || 0) + 1);
}

function setUniqueMapValue(map, key, value) {
  if (!key) {
    return;
  }

  if (map.has(key)) {
    map.set(key, null);
    return;
  }

  map.set(key, value);
}

function getTaskSignature(taskType, description) {
  const descriptionKey = normalizeLookupText(description);
  if (!descriptionKey) {
    return "";
  }

  return `${normalizeLookupText(taskType) || "general"}::${descriptionKey}`;
}

function buildDateString(year, month, day) {
  const normalizedYear = Number(year);
  const normalizedMonth = Number(month);
  const normalizedDay = Number(day);

  if (
    !Number.isInteger(normalizedYear) ||
    !Number.isInteger(normalizedMonth) ||
    !Number.isInteger(normalizedDay) ||
    normalizedYear < 1900 ||
    normalizedMonth < 1 ||
    normalizedMonth > 12 ||
    normalizedDay < 1 ||
    normalizedDay > 31
  ) {
    return "";
  }

  return `${normalizedYear}-${String(normalizedMonth).padStart(2, "0")}-${String(normalizedDay).padStart(2, "0")}`;
}

function parseDateText(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    return buildDateString(isoMatch[1], isoMatch[2], isoMatch[3]);
  }

  const dayMonthNameMatch = text.match(/^(\d{1,2})[\s-/.,]+([A-Za-z]+)[\s-/.,]+(\d{2,4})$/);
  if (dayMonthNameMatch) {
    const [, day, monthName, year] = dayMonthNameMatch;
    const month = monthNumberByName[monthName.toLowerCase()];
    const normalizedYear = Number(year) < 100 ? Number(year) + 2000 : Number(year);
    return month ? buildDateString(normalizedYear, month, day) : "";
  }

  const monthNameDayMatch = text.match(/^([A-Za-z]+)[\s-/.,]+(\d{1,2})[\s-/.,]+(\d{2,4})$/);
  if (monthNameDayMatch) {
    const [, monthName, day, year] = monthNameDayMatch;
    const month = monthNumberByName[monthName.toLowerCase()];
    const normalizedYear = Number(year) < 100 ? Number(year) + 2000 : Number(year);
    return month ? buildDateString(normalizedYear, month, day) : "";
  }

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, first, second, year] = slashMatch;
    const normalizedYear = Number(year) < 100 ? Number(year) + 2000 : Number(year);
    const firstNumber = Number(first);
    const secondNumber = Number(second);

    if (firstNumber > 12) {
      return buildDateString(normalizedYear, second, first);
    }

    return buildDateString(normalizedYear, first, second);
  }

  return "";
}

function parseExcelDate(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    return buildDateString(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }

  if (typeof value === "number") {
    const parsedDate = XLSX.SSF.parse_date_code(value);
    if (!parsedDate) {
      return "";
    }

    return buildDateString(parsedDate.y, parsedDate.m, parsedDate.d);
  }

  return parseDateText(value);
}

function formatExcelDate(value) {
  const date = parseExcelDate(value);
  if (!date) {
    return "";
  }

  const parsedDate = new Date(`${date}T00:00:00`);
  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function resolveStatus(value, isPhase) {
  const normalizedStatus = String(value || "").trim().toLowerCase();
  if (!normalizedStatus) {
    return isPhase ? "na" : "pending";
  }

  return (
    TASK_STATUS_OPTIONS.find((option) => option.value === normalizedStatus)?.value ||
    statusValueByLabel[normalizedStatus] ||
    (isPhase ? "na" : "pending")
  );
}

function resolveOwnerIds(row, assignees) {
  const emails = splitCellList(row[TIMELINE_COLUMNS.assignedMemberEmails]).map((email) =>
    email.toLowerCase()
  );
  const names = splitCellList(row[TIMELINE_COLUMNS.assignedMembers]).map((name) =>
    name.toLowerCase()
  );

  return assignees
    .filter((member) => {
      const memberEmail = String(member.email || "").toLowerCase();
      const memberName = String(member.name || "").toLowerCase();
      return (
        (memberEmail && emails.includes(memberEmail)) ||
        (memberName && names.includes(memberName))
      );
    })
    .map((member) => member.id);
}

function buildTimelineRows(project) {
  const taskById = new Map(project.timeline.data.map((task) => [String(task.id), task]));
  const dependencyIdsByTaskId = project.timeline.links.reduce((accumulator, link) => {
    const targetId = String(link.target || "");
    const sourceId = String(link.source || "");
    if (!targetId || !sourceId) {
      return accumulator;
    }

    accumulator.set(targetId, [...(accumulator.get(targetId) || []), sourceId]);
    return accumulator;
  }, new Map());

  return project.timeline.data.map((task) => {
    const dependencyIds = dependencyIdsByTaskId.get(String(task.id)) || [];
    const dependencyNames = dependencyIds
      .map((dependencyId) => taskById.get(String(dependencyId))?.text)
      .filter(Boolean);
    const assignedMembers = (task.ownerIds || [])
      .map((ownerId) => project.teamMembers.find((member) => member.id === ownerId))
      .filter(Boolean);

    return {
      [TIMELINE_COLUMNS.taskId]: task.id,
      [TIMELINE_COLUMNS.taskType]: task.taskType || "General",
      [TIMELINE_COLUMNS.description]: task.text || "",
      [TIMELINE_COLUMNS.ownerRole]: task.ownerRole || "",
      [TIMELINE_COLUMNS.assignedMembers]: assignedMembers
        .map((member) => member.name)
        .join(" | "),
      [TIMELINE_COLUMNS.assignedMemberEmails]: assignedMembers
        .map((member) => member.email)
        .filter(Boolean)
        .join(" | "),
      [TIMELINE_COLUMNS.startDate]: formatExcelDate(task.start_date),
      [TIMELINE_COLUMNS.endDate]: formatExcelDate(task.end_date),
      [TIMELINE_COLUMNS.status]: statusLabelByValue[task.status] || "Pending",
      [TIMELINE_COLUMNS.dependencies]: dependencyNames.join(" | "),
      [TIMELINE_COLUMNS.dependencyIds]: dependencyIds.join(" | "),
    };
  });
}

function buildTimelineFromRows(rows, project) {
  const usedIds = new Set();
  const importedRows = rows.filter((row) =>
    [
      TIMELINE_COLUMNS.taskId,
      TIMELINE_COLUMNS.taskType,
      TIMELINE_COLUMNS.description,
      TIMELINE_COLUMNS.ownerRole,
      TIMELINE_COLUMNS.startDate,
      TIMELINE_COLUMNS.endDate,
      TIMELINE_COLUMNS.status,
    ].some((column) => String(row[column] || "").trim())
  );

  const existingTasks = Array.isArray(project.timeline?.data) ? project.timeline.data : [];
  const existingTaskIds = new Set(existingTasks.map((task) => String(task.id)));
  const importedIdCounts = new Map();
  const importedSignatureCounts = new Map();
  const existingIdBySignature = new Map();

  existingTasks.forEach((task) => {
    setUniqueMapValue(
      existingIdBySignature,
      getTaskSignature(task.taskType || (task.isPhase ? "Phase" : "General"), task.text),
      String(task.id)
    );
  });

  importedRows.forEach((row) => {
    incrementCount(importedIdCounts, String(row[TIMELINE_COLUMNS.taskId] || "").trim());
    incrementCount(
      importedSignatureCounts,
      getTaskSignature(
        String(row[TIMELINE_COLUMNS.taskType] || "").trim() || "General",
        row[TIMELINE_COLUMNS.description]
      )
    );
  });

  const idByImportedId = new Map();
  const nextData = importedRows.map((row, index) => {
    const importedId = String(row[TIMELINE_COLUMNS.taskId] || "").trim();
    const taskType = String(row[TIMELINE_COLUMNS.taskType] || "").trim() || "General";
    const rowSignature = getTaskSignature(taskType, row[TIMELINE_COLUMNS.description]);
    const matchedExistingId =
      rowSignature && importedSignatureCounts.get(rowSignature) === 1
        ? existingIdBySignature.get(rowSignature)
        : null;
    let nextId =
      importedId && importedIdCounts.get(importedId) === 1 && existingTaskIds.has(importedId)
        ? importedId
        : matchedExistingId || createImportId("task");

    if (usedIds.has(nextId)) {
      nextId = createImportId("task");
    }

    usedIds.add(nextId);
    if (importedId && importedIdCounts.get(importedId) === 1) {
      idByImportedId.set(importedId, nextId);
    }

    const isPhase = taskType.toLowerCase() === "phase";

    return normalizeStoredTask({
      id: nextId,
      taskType,
      text:
        String(row[TIMELINE_COLUMNS.description] || "").trim() ||
        `Imported task ${index + 1}`,
      ownerRole: String(row[TIMELINE_COLUMNS.ownerRole] || "").trim(),
      ownerIds: resolveOwnerIds(row, project.teamMembers),
      start_date: parseExcelDate(row[TIMELINE_COLUMNS.startDate]),
      end_date: parseExcelDate(row[TIMELINE_COLUMNS.endDate]),
      status: resolveStatus(row[TIMELINE_COLUMNS.status], isPhase),
      isPhase,
      open: true,
    });
  });

  const idByDescription = new Map();
  nextData.forEach((task) => {
    setUniqueMapValue(idByDescription, normalizeLookupText(task.text), task.id);
  });

  const nextLinks = importedRows.flatMap((row, rowIndex) => {
    const targetId = nextData[rowIndex]?.id;
    if (!targetId) {
      return [];
    }

    const dependencyIds = splitCellList(row[TIMELINE_COLUMNS.dependencyIds])
      .map((dependencyId) => idByImportedId.get(dependencyId) || dependencyId)
      .filter((dependencyId) => usedIds.has(dependencyId) && dependencyId !== targetId);
    const dependencyNames = splitCellList(row[TIMELINE_COLUMNS.dependencies])
      .map((dependencyName) => idByDescription.get(normalizeLookupText(dependencyName)))
      .filter((dependencyId) => dependencyId && dependencyId !== targetId);
    const uniqueDependencyIds = Array.from(new Set([...dependencyIds, ...dependencyNames]));

    return uniqueDependencyIds.map((sourceId, dependencyIndex) => ({
      id: createImportId("link"),
      source: sourceId,
      target: targetId,
      type: "0",
      importOrder: `${rowIndex + 1}-${dependencyIndex + 1}`,
    }));
  });

  return {
    data: nextData,
    links: nextLinks.map(({ importOrder, ...link }) => link),
    version: project.timeline.version,
    isCustomized: true,
  };
}

function StatCard({ label, value, hint, tone = "neutral" }) {
  return (
    <article
      className={[
        "relative overflow-hidden rounded-[8px] border border-[#d7dfeb] bg-white px-5 py-[18px] shadow-[0_8px_24px_rgba(16,24,40,0.06)] before:absolute before:inset-x-0 before:top-0 before:h-1 before:content-['']",
        statToneClasses[tone] || "before:bg-[#d0d5dd]",
      ].join(" ")}
    >
      <p className="mb-3.5 text-sm font-bold text-[#475467]">{label}</p>
      <strong className="mb-1 block font-Merriweather text-[36px] leading-none font-bold text-[#070c11]">
        {value}
      </strong>
      <span className="text-sm text-[#667085]">{hint}</span>
    </article>
  );
}

function ProjectTimelinePage({ projects, onTimelineChange, readOnly = false }) {
  const { projectId } = useParams();
  const project = readOnly
    ? findProjectByPublicTimelineId(projects, projectId)
    : projects.find((item) => item.id === projectId) ?? null;
  const importInputRef = useRef(null);
  const [zoom, setZoom] = useState("week");
  const [viewMode, setViewMode] = useState("table");
  const [importError, setImportError] = useState("");

  const stats = useMemo(() => {
    if (!project) {
      return null;
    }

    const taskRows = project.timeline.data.filter((task) => !task.isPhase);
    const scheduledTasks = taskRows.filter((task) => task.start_date && task.end_date);
    const ongoingTasks = taskRows.filter((task) => task.status === "ongoing");
    const completedTasks = taskRows.filter((task) => task.status === "done");

    return {
      total: taskRows.length,
      scheduled: scheduledTasks.length,
      ongoing: ongoingTasks.length,
      completed: completedTasks.length,
    };
  }, [project]);

  if (!project) {
    if (readOnly) {
      return (
        <div className="rounded-[8px] border border-[#d7dfeb] bg-white px-6 py-5 text-sm font-bold text-[#667085] shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
          This project timeline is not available.
        </div>
      );
    }

    return <Navigate to="/projects" replace />;
  }

  const handleExportTimeline = () => {
    const rows = buildTimelineRows(project);
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: Object.values(TIMELINE_COLUMNS),
    });

    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 22 },
      { wch: 42 },
      { wch: 24 },
      { wch: 34 },
      { wch: 36 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 42 },
      { wch: 42 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, TIMELINE_SHEET_NAME);
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["How to import"],
        ["Update rows in the Project Timeline sheet, then import the same .xlsx file."],
        ["Task ID values are optional. Valid existing IDs are preserved; blank, duplicate, or stale IDs are repaired during import."],
        ["Dependency Task IDs are optional. Dependencies are rebuilt from valid IDs and matching Task Dependencies names."],
        ["Use dates like 20 Apr 2026 for Start Date and End Date."],
        ["Separate multiple team members or dependencies with |"],
      ]),
      "Import Guide"
    );

    XLSX.writeFile(
      workbook,
      `${sanitizeFileName(project.name)}-timeline.xlsx`,
      { compression: true }
    );
  };

  const handleImportClick = () => {
    setImportError("");
    importInputRef.current?.click();
  };

  const handleImportTimeline = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setImportError("");

    if (!file) {
      return;
    }

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), {
        cellDates: false,
      });
      const worksheet =
        workbook.Sheets[TIMELINE_SHEET_NAME] ||
        workbook.Sheets[workbook.SheetNames[0]];

      if (!worksheet) {
        throw new Error("No worksheet found in the selected Excel file.");
      }

      const rows = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false,
        dateNF: "yyyy-mm-dd",
      });
      const nextTimeline = buildTimelineFromRows(rows, project);

      if (!nextTimeline.data.length) {
        throw new Error("No timeline rows were found to import.");
      }

      const didConfirm = window.confirm(
        `Import ${nextTimeline.data.length} tasks from this Excel file? This will replace the current project timeline.`
      );

      if (!didConfirm) {
        return;
      }

      onTimelineChange(project.id, nextTimeline);
    } catch (error) {
      setImportError(error.message || "Unable to import this timeline.");
    }
  };

  return (
    <div className="min-w-0">
      <section className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-4">
        <StatCard
          label="Total Tasks"
          value={stats.total}
          hint="All project activities"
          tone="amber"
        />
        <StatCard
          label="Scheduled Tasks"
          value={stats.scheduled}
          hint="Tasks with start and end dates"
          tone="blue"
        />
        <StatCard
          label="Ongoing Tasks"
          value={stats.ongoing}
          hint="Currently being worked on"
          tone="red"
        />
        <StatCard
          label="Completed Tasks"
          value={stats.completed}
          hint="Marked done"
          tone="green"
        />
      </section>

      <section className="min-w-0 max-w-full overflow-hidden rounded-[8px] border border-[#d7dfeb] bg-white p-[18px] shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
        {!readOnly ? (
          <input
            ref={importInputRef}
            type="file"
            className="hidden"
            accept=".xlsx,.xls"
            onChange={handleImportTimeline}
          />
        ) : null}
        {importError ? (
          <div className="mb-4 rounded-[8px] border border-[#ffd5d2] bg-[#fff5f4] px-4 py-3 text-sm font-bold text-[#b42318]">
            {importError}
          </div>
        ) : null}
        <Gantt
          tasks={project.timeline}
          zoom={zoom}
          onZoomChange={setZoom}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          assignees={project.teamMembers}
          onImportTimeline={readOnly ? null : handleImportClick}
          onExportTimeline={readOnly ? null : handleExportTimeline}
          onTasksChange={
            readOnly ? null : (nextTimeline) => onTimelineChange(project.id, nextTimeline)
          }
          readOnly={readOnly}
        />
      </section>
    </div>
  );
}

export default ProjectTimelinePage;
