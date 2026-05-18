import { useEffect, useRef, useState } from "react";
import { gantt } from "dhtmlx-gantt";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import {
  addDays,
  diffInDaysInclusive,
  formatDisplayDate,
  formatDateString,
  fromGanttTask,
  getOwnerLabel,
  OWNER_ROLE_OPTIONS,
  parseDateString,
  progressFromStatus,
  TASK_STATUS_LABELS,
  TASK_STATUS_OPTIONS,
  toGanttTask,
} from "../lib/timeline";

const ZOOM_CONFIG = {
  day: {
    min_column_width: 56,
    scale_height: 72,
    scales: [
      { unit: "month", step: 1, format: "%F %Y" },
      { unit: "day", step: 1, format: "%j %D" },
    ],
  },
  week: {
    min_column_width: 72,
    scale_height: 72,
    scales: [
      { unit: "month", step: 1, format: "%F %Y" },
      {
        unit: "week",
        step: 1,
        format: (date) => {
          const start = gantt.date.week_start(new Date(date));
          const end = gantt.date.add(gantt.date.add(start, 1, "week"), -1, "day");
          return `${gantt.date.date_to_str("%M %j")(start)} - ${gantt.date.date_to_str("%j")(end)}`;
        },
      },
    ],
  },
  month: {
    min_column_width: 90,
    scale_height: 72,
    scales: [
      { unit: "year", step: 1, format: "%Y" },
      { unit: "month", step: 1, format: "%M" },
    ],
  },
};

const inputClass =
  "form-field w-full rounded-[8px] border border-[#c5d0de] bg-white px-[14px] py-3 text-sm text-[#070c11] outline-none transition focus:border-[rgba(23,178,106,0.5)] focus:shadow-[0_0_0_4px_rgba(23,178,106,0.08)]";

function createTimelineId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function serializeTimelineFromGantt() {
  const orderedTasks = [];

  gantt.eachTask((task) => {
    orderedTasks.push(fromGanttTask(task));
  });

  return {
    data: orderedTasks,
    links: gantt.getLinks().map((link) => ({
      ...link,
      type: "0",
    })),
  };
}

function focusChartOnTasks(nextTasks) {
  const scheduledTasks = nextTasks.data
    .map((task) => toGanttTask(task))
    .filter((task) => task.start_date instanceof Date && !Number.isNaN(task.start_date.getTime()))
    .sort((leftTask, rightTask) => leftTask.start_date - rightTask.start_date);

  if (!scheduledTasks.length) {
    return;
  }

  gantt.showDate(scheduledTasks[0].start_date);
}

function mapTaskToEditor(task, dependencyIds = []) {
  const normalizedTask = fromGanttTask(task);

  return {
    id: task.id,
    taskType: normalizedTask.taskType || "General",
    text: normalizedTask.text || "",
    ownerRole: normalizedTask.ownerRole || "",
    ownerIds: Array.isArray(normalizedTask.ownerIds) ? normalizedTask.ownerIds : [],
    dependencyIds,
    start_date: normalizedTask.start_date || "",
    end_date: normalizedTask.end_date || "",
    status: normalizedTask.status || "pending",
  };
}

function buildInlineDateCell(task, value, fieldLabel, actionKey, inlineDateEditor) {
  if (
    inlineDateEditor &&
    inlineDateEditor.taskId === String(task.id) &&
    inlineDateEditor.field === actionKey
  ) {
    return `<div class="gantt-inline-date-editor">
      <input
        type="date"
        class="gantt-inline-date-input"
        data-task-inline-input="${task.id}"
        data-date-field="${actionKey}"
        aria-label="Select ${fieldLabel}"
        value="${inlineDateEditor.value || ""}"
      />
    </div>`;
  }

  return `<div class="gantt-inline-cell">
    <span class="gantt-cell-text">${value || "Not set"}</span>
    <button
      type="button"
      class="gantt-inline-edit"
      data-task-inline-date="${task.id}"
      data-date-field="${actionKey}"
      aria-label="Edit ${fieldLabel}"
      title="Edit ${fieldLabel}"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20h4l9.8-9.8-4-4L4 16v4Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
        <path d="m12.8 6.2 4 4 1.8-1.8a1.9 1.9 0 0 0 0-2.8l-1.2-1.2a1.9 1.9 0 0 0-2.8 0l-1.8 1.8Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>`;
}

function Gantt({
  tasks,
  zoom,
  onZoomChange,
  assignees,
  viewMode,
  onViewModeChange,
  onTasksChange,
}) {
  const containerRef = useRef(null);
  const initializedRef = useRef(false);
  const syncingRef = useRef(false);
  const assigneesRef = useRef(assignees);
  const onTasksChangeRef = useRef(onTasksChange);
  const inlineDateEditorRef = useRef(null);
  const pendingScrollStateRef = useRef(null);
  const [editorState, setEditorState] = useState(null);
  const [inlineDateEditor, setInlineDateEditor] = useState(null);

  useEffect(() => {
    if (!editorState) {
      return undefined;
    }

    const handleEscapeClose = (event) => {
      if (event.key === "Escape") {
        closeEditor();
      }
    };

    document.addEventListener("keydown", handleEscapeClose);

    return () => {
      document.removeEventListener("keydown", handleEscapeClose);
    };
  }, [editorState]);

  assigneesRef.current = assignees;
  onTasksChangeRef.current = onTasksChange;
  inlineDateEditorRef.current = inlineDateEditor;

  const openEditor = (taskId) => {
    if (!gantt.isTaskExists(taskId)) {
      return;
    }

    const dependencyIds = gantt
      .getLinks()
      .filter((link) => String(link.target) === String(taskId))
      .map((link) => String(link.source));

    setEditorState(mapTaskToEditor(gantt.getTask(taskId), dependencyIds));
  };

  const closeEditor = () => {
    setEditorState(null);
  };

  const closeInlineDateEditor = () => {
    setInlineDateEditor(null);
  };

  const emitChange = () => {
    if (syncingRef.current || !onTasksChangeRef.current) {
      return;
    }

    if (typeof gantt.getScrollState === "function") {
      pendingScrollStateRef.current = gantt.getScrollState();
    }

    onTasksChangeRef.current(serializeTimelineFromGantt());
  };

  const applyTaskUpdates = (taskId, updates) => {
    if (!gantt.isTaskExists(taskId)) {
      return;
    }

    const task = gantt.getTask(taskId);
    const nextTask = { ...task, ...updates };

    if ("status" in updates) {
      nextTask.progress = progressFromStatus(updates.status, task.progress);
    }

    if ("start_date" in updates || "end_date" in updates) {
      const startDate =
        "start_date" in updates
          ? updates.start_date
            ? parseDateString(updates.start_date)
            : ""
          : task.start_date;
      const endDate =
        "end_date" in updates
          ? updates.end_date
            ? parseDateString(addDays(updates.end_date, 1))
            : ""
          : task.end_date;

      nextTask.start_date = startDate;
      nextTask.end_date = endDate;

      const storedStartDate = startDate ? fromGanttTask({ start_date: startDate }).start_date : "";
      const storedEndDate = endDate ? fromGanttTask({ end_date: endDate }).end_date : "";

      nextTask.duration =
        storedStartDate && storedEndDate
          ? diffInDaysInclusive(storedStartDate, storedEndDate)
          : Math.max(1, Number(task.duration) || 1);
      nextTask.unscheduled = !(storedStartDate && storedEndDate);
    }

    Object.assign(task, nextTask);
    gantt.updateTask(taskId);
    emitChange();
  };

  const applyTaskDependencies = (taskId, dependencyIds) => {
    const nextDependencyIds = [...new Set(dependencyIds.map(String))].filter(
      (dependencyId) => dependencyId !== String(taskId) && gantt.isTaskExists(dependencyId)
    );
    const currentLinks = gantt
      .getLinks()
      .filter((link) => String(link.target) === String(taskId));

    syncingRef.current = true;

    currentLinks.forEach((link) => {
      if (!nextDependencyIds.includes(String(link.source))) {
        gantt.deleteLink(link.id);
      }
    });

    nextDependencyIds.forEach((dependencyId) => {
      const alreadyExists = currentLinks.some(
        (link) =>
          String(link.source) === dependencyId &&
          String(link.target) === String(taskId)
      );

      if (!alreadyExists) {
        gantt.addLink({
          id: createTimelineId("link"),
          source: dependencyId,
          target: taskId,
          type: "0",
        });
      }
    });

    syncingRef.current = false;
  };

  const createDraftTask = () => ({
    taskType: "General",
    text: "New Website Task",
    ownerRole: "",
    ownerIds: [],
    status: "pending",
    duration: 1,
    progress: 0,
    start_date: "",
    end_date: "",
    unscheduled: true,
    open: true,
  });

  useEffect(() => {
    if (initializedRef.current) {
      return undefined;
    }

    gantt.plugins({
      auto_scheduling: true,
      click_drag: true,
      tooltip: true,
    });

    gantt.config.xml_date = "%Y-%m-%d";
    gantt.config.date_format = "%Y-%m-%d";
    gantt.config.autosize = false;
    gantt.config.grid_width = 920;
    gantt.config.row_height = 46;
    gantt.config.bar_height = 24;
    gantt.config.drag_progress = true;
    gantt.config.drag_resize = true;
    gantt.config.drag_move = true;
    gantt.config.auto_scheduling = true;
    gantt.config.auto_scheduling_strict = true;
    gantt.config.fit_tasks = true;
    gantt.config.open_split_tasks = true;
    gantt.config.work_time = true;
    gantt.config.duration_unit = "day";
    gantt.config.details_on_create = false;
    gantt.config.details_on_dblclick = false;
    gantt.config.show_unscheduled = true;
    gantt.config.order_branch = true;
    gantt.config.order_branch_free = true;

    gantt.config.columns = [
      {
        name: "taskType",
        label: "Type of Task",
        tree: false,
        width: 215,
        template: (task) =>
          `<span class="gantt-cell-text gantt-cell-text-strong">${task.taskType || "General"}</span>`,
      },
      {
        name: "text",
        label: "Description",
        width: "*",
        template: (task) =>
          `<span class="gantt-cell-text gantt-cell-text-strong">${task.text || "Untitled task"}</span>`,
      },
      {
        name: "ownerIds",
        label: "Owner",
        width: 150,
        template: (task) =>
          `<span class="gantt-cell-text">${getOwnerLabel(task, assigneesRef.current)}</span>`,
      },
      {
        name: "start_date",
        label: "Start Date",
        align: "left",
        width: 159,
        template: (task) =>
          buildInlineDateCell(
            task,
            task.start_date ? formatDisplayDate(task.start_date) : "Not set",
            "start date",
            "start_date",
            inlineDateEditorRef.current
          ),
      },
      {
        name: "end_date",
        label: "End Date",
        align: "left",
        width: 159,
        template: (task) =>
          buildInlineDateCell(
            task,
            task.start_date && task.end_date
              ? formatDisplayDate(gantt.date.add(task.end_date, -1, "day"))
              : "Not set",
            "end date",
            "end_date",
            inlineDateEditorRef.current
          ),
      },
      {
        name: "status",
        label: "Status",
        align: "center",
        width: 150,
        template: (task) =>
          `<div class="gantt-inline-status">
            <select class="gantt-status-select gantt-status-${task.status || "pending"}" data-task-status="${task.id}" aria-label="Change task status">
              ${TASK_STATUS_OPTIONS.map(
                (option) =>
                  `<option value="${option.value}" ${option.value === (task.status || "pending") ? "selected" : ""}>${option.label}</option>`
              ).join("")}
            </select>
          </div>`,
      },
      {
        name: "actions",
        label: "Actions",
        align: "left",
        width: 153,
        template: (task) =>
          `<div class="gantt-actions-cell">
            <button type="button" class="gantt-grid-edit" data-task-edit="${task.id}" aria-label="Edit task" title="Edit task">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 20h4l9.8-9.8-4-4L4 16v4Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
              <path d="m12.8 6.2 4 4 1.8-1.8a1.9 1.9 0 0 0 0-2.8l-1.2-1.2a1.9 1.9 0 0 0-2.8 0l-1.8 1.8Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
            </svg>
            </button>
            <button type="button" class="gantt-grid-delete" data-task-delete="${task.id}" aria-label="Delete task" title="Delete task">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
              <path d="M9 7V5.8C9 4.81 9.81 4 10.8 4h2.4C14.19 4 15 4.81 15 5.8V7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
              <path d="M7 7l.8 11.2A2 2 0 0 0 9.79 20h4.42a2 2 0 0 0 1.99-1.8L17 7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 11v5M14 11v5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
            </svg>
            </button>
            <button type="button" class="gantt-grid-add-row" data-task-add="${task.id}" aria-label="Add task after this row" title="Add task after this row">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
            </svg>
            </button>
          </div>`,
      },
    ];

    gantt.templates.tooltip_text = (start, end, task) => {
      const displayEnd =
        task.start_date && task.end_date ? addDays(formatDateString(end), -1) : "";
      const schedule =
        task.start_date && displayEnd
          ? `${formatDisplayDate(start)} - ${formatDisplayDate(displayEnd)}`
          : "Dates not scheduled yet";

      return `
        <strong>${task.taskType || "General"}</strong><br/>
        ${task.text || "Untitled task"}<br/>
        Owner: ${getOwnerLabel(task, assigneesRef.current)}<br/>
        Status: ${TASK_STATUS_LABELS[task.status] || "Pending"}<br/>
        ${schedule}
      `;
    };

    gantt.templates.task_text = (start, end, task) => task.text;
    gantt.templates.task_class = (start, end, task) => {
      if (task.unscheduled) {
        return "task-unscheduled";
      }
      if (task.status === "done") {
        return "task-complete";
      }
      if (task.status === "ongoing") {
        return "task-healthy";
      }
      if (task.status === "cancelled" || task.status === "failed") {
        return "task-risk";
      }
      return "task-active";
    };

    gantt.templates.task_unscheduled_time = () => "Dates not scheduled";

    gantt.attachEvent("onBeforeLinkAdd", (id, link) => {
      if (link.source === link.target) {
        return false;
      }

      return String(link.type) === String(gantt.config.links.finish_to_start);
    });

    gantt.attachEvent("onTaskDblClick", (id) => {
      openEditor(id);
      return false;
    });

    gantt.attachEvent("onGridDblClick", (id) => {
      openEditor(id);
      return false;
    });

    gantt.attachEvent("onTaskCreated", (task) => {
      task.taskType = "General";
      task.text = task.text || "New Website Task";
      task.ownerRole = "";
      task.ownerIds = [];
      task.status = "pending";
      task.progress = 0;
      task.duration = task.duration || 1;
      task.unscheduled = !task.start_date;
      return true;
    });

    gantt.attachEvent("onAfterTaskAdd", emitChange);
    gantt.attachEvent("onAfterTaskUpdate", emitChange);
    gantt.attachEvent("onAfterTaskDelete", emitChange);
    gantt.attachEvent("onAfterTaskMove", emitChange);
    gantt.attachEvent("onRowDragEnd", emitChange);
    gantt.attachEvent("onAfterLinkAdd", emitChange);
    gantt.attachEvent("onAfterLinkUpdate", emitChange);
    gantt.attachEvent("onAfterLinkDelete", emitChange);

    gantt.ext.zoom.init({
      levels: Object.entries(ZOOM_CONFIG).map(([name, config]) => ({
        name,
        ...config,
      })),
    });

    gantt.init(containerRef.current);
    initializedRef.current = true;

    return () => {
      gantt.clearAll();
      gantt.detachAllEvents();
      initializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!initializedRef.current || !containerRef.current) {
      return;
    }

    const handleActionHoverState = (event) => {
      if (
        event.target.closest(
          ".gantt-actions-cell, .gantt-inline-edit, .gantt-status-select, .gantt-inline-date-input"
        )
      ) {
        document.body.classList.add("gantt-hide-row-tooltip");
      } else {
        document.body.classList.remove("gantt-hide-row-tooltip");
      }
    };

    const handleGridButtonClick = (event) => {
      const editButton = event.target.closest("[data-task-edit]");
      if (editButton) {
        const taskId = editButton.getAttribute("data-task-edit");
        if (taskId) {
          openEditor(taskId);
        }
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const deleteButton = event.target.closest("[data-task-delete]");
      if (deleteButton) {
        const taskId = deleteButton.getAttribute("data-task-delete");
        if (taskId && gantt.isTaskExists(taskId)) {
          gantt.deleteTask(taskId);
          emitChange();
        }
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const addButton = event.target.closest("[data-task-add]");
      if (addButton) {
        const taskId = addButton.getAttribute("data-task-add");
        if (taskId && gantt.isTaskExists(taskId)) {
          const parentId = gantt.getParent(taskId) || 0;
          const insertIndex = gantt.getTaskIndex(taskId) + 1;
          const newTaskId = gantt.addTask(createDraftTask(), parentId, insertIndex);
          emitChange();
          openEditor(newTaskId);
        }
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const inlineDateButton = event.target.closest("[data-task-inline-date]");
      if (inlineDateButton) {
        const taskId = inlineDateButton.getAttribute("data-task-inline-date");
        const dateField = inlineDateButton.getAttribute("data-date-field");
        if (taskId && dateField && gantt.isTaskExists(taskId)) {
          const task = fromGanttTask(gantt.getTask(taskId));
          setInlineDateEditor({
            taskId: String(taskId),
            field: dateField,
            value: task[dateField] || "",
          });
        }
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    };

    const handleGridChange = (event) => {
      const inlineDateInput = event.target.closest("[data-task-inline-input]");
      if (inlineDateInput) {
        const taskId = inlineDateInput.getAttribute("data-task-inline-input");
        const dateField = inlineDateInput.getAttribute("data-date-field");
        if (taskId && dateField) {
          applyTaskUpdates(taskId, { [dateField]: inlineDateInput.value });
        }
        closeInlineDateEditor();
        event.stopPropagation();
        return;
      }

      const statusSelect = event.target.closest("[data-task-status]");
      if (!statusSelect) {
        return;
      }

      const taskId = statusSelect.getAttribute("data-task-status");
      if (taskId) {
        applyTaskUpdates(taskId, { status: statusSelect.value });
      }
      event.stopPropagation();
    };

    const handleGridFocusOut = (event) => {
      const dateInput = event.target.closest("[data-task-inline-input]");
      if (!dateInput) {
        return;
      }

      window.setTimeout(() => {
        const activeElement = document.activeElement;
        if (!activeElement || activeElement !== dateInput) {
          closeInlineDateEditor();
        }
      }, 0);
    };

    const handleGridKeyDown = (event) => {
      const dateInput = event.target.closest("[data-task-inline-input]");
      if (!dateInput) {
        return;
      }

      if (event.key === "Escape") {
        closeInlineDateEditor();
        event.preventDefault();
        event.stopPropagation();
      }
    };

    containerRef.current.addEventListener("mouseover", handleActionHoverState);
    containerRef.current.addEventListener("mouseout", handleActionHoverState);
    containerRef.current.addEventListener("click", handleGridButtonClick);
    containerRef.current.addEventListener("change", handleGridChange);
    containerRef.current.addEventListener("focusout", handleGridFocusOut);
    containerRef.current.addEventListener("keydown", handleGridKeyDown);

    return () => {
      document.body.classList.remove("gantt-hide-row-tooltip");
      containerRef.current?.removeEventListener("mouseover", handleActionHoverState);
      containerRef.current?.removeEventListener("mouseout", handleActionHoverState);
      containerRef.current?.removeEventListener("click", handleGridButtonClick);
      containerRef.current?.removeEventListener("change", handleGridChange);
      containerRef.current?.removeEventListener("focusout", handleGridFocusOut);
      containerRef.current?.removeEventListener("keydown", handleGridKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
      return;
    }

    gantt.render();

    if (!inlineDateEditor || !containerRef.current) {
      return;
    }

    const focusInput = () => {
      const input = containerRef.current?.querySelector(
        `[data-task-inline-input="${inlineDateEditor.taskId}"][data-date-field="${inlineDateEditor.field}"]`
      );

      if (!(input instanceof HTMLInputElement)) {
        return;
      }

      input.focus();
      if (typeof input.showPicker === "function") {
        input.showPicker();
      }
    };

    const frameId = window.requestAnimationFrame(focusInput);
    return () => window.cancelAnimationFrame(frameId);
  }, [inlineDateEditor]);

  useEffect(() => {
    if (!initializedRef.current) {
      return;
    }

    gantt.ext.zoom.setLevel(zoom);
  }, [zoom]);

  useEffect(() => {
    if (!initializedRef.current) {
      return;
    }

    const containerWidth = containerRef.current?.clientWidth || 1200;
    gantt.config.show_grid = viewMode !== "chart";
    gantt.config.show_chart = viewMode !== "table";
    gantt.config.grid_width = viewMode === "table" ? Math.max(720, containerWidth - 2) : 920;
    gantt.setSizes();
    gantt.render();

    if (viewMode === "chart") {
      focusChartOnTasks(tasks);
    }
  }, [viewMode]);

  useEffect(() => {
    if (!initializedRef.current) {
      return;
    }

    syncingRef.current = true;
    gantt.clearAll();
    const parsedTasks = tasks.data.map((task) => toGanttTask(task));
    gantt.parse({
      data: parsedTasks,
      links: tasks.links,
    });
    gantt.setSizes();

    const pendingScrollState = pendingScrollStateRef.current;
    if (pendingScrollState && typeof gantt.scrollTo === "function") {
      const frameId = window.requestAnimationFrame(() => {
        gantt.scrollTo(pendingScrollState.x || 0, pendingScrollState.y || 0);
        pendingScrollStateRef.current = null;
        syncingRef.current = false;
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    if (viewMode === "chart") {
      const firstScheduledTask = parsedTasks.find(
        (task) =>
          task.start_date instanceof Date && !Number.isNaN(task.start_date.getTime())
      );

      if (firstScheduledTask) {
        gantt.showDate(firstScheduledTask.start_date);
      }
    }

    syncingRef.current = false;
  }, [tasks, viewMode]);

  const handleAddTask = () => {
    const taskId = gantt.addTask(createDraftTask());

    emitChange();
    openEditor(taskId);
  };

  const handleToggleOwner = (ownerId) => {
    setEditorState((current) => {
      if (!current) {
        return current;
      }

      const hasOwner = current.ownerIds.includes(ownerId);
      return {
        ...current,
        ownerIds: hasOwner
          ? current.ownerIds.filter((item) => item !== ownerId)
          : [...current.ownerIds, ownerId],
      };
    });
  };

  const handleToggleDependency = (dependencyId) => {
    setEditorState((current) => {
      if (!current) {
        return current;
      }

      const dependencyKey = String(dependencyId);
      const hasDependency = current.dependencyIds.includes(dependencyKey);

      return {
        ...current,
        dependencyIds: hasDependency
          ? current.dependencyIds.filter((item) => item !== dependencyKey)
          : [...current.dependencyIds, dependencyKey],
      };
    });
  };

  const handleSaveEditor = () => {
    if (!editorState || !gantt.isTaskExists(editorState.id)) {
      closeEditor();
      return;
    }

    const task = gantt.getTask(editorState.id);
    task.taskType = editorState.taskType.trim() || "General";
    task.text = editorState.text.trim() || "Untitled task";
    task.ownerRole = editorState.ownerRole.trim();
    task.ownerIds = editorState.ownerIds;
    task.status = editorState.status;
    task.progress = progressFromStatus(editorState.status, task.progress);
    task.start_date = editorState.start_date ? parseDateString(editorState.start_date) : "";
    task.end_date = editorState.end_date
      ? parseDateString(addDays(editorState.end_date, 1))
      : "";
    task.duration =
      editorState.start_date && editorState.end_date
        ? diffInDaysInclusive(editorState.start_date, editorState.end_date)
        : Math.max(1, Number(task.duration) || 1);
    task.unscheduled = !(editorState.start_date && editorState.end_date);

    syncingRef.current = true;
    gantt.updateTask(editorState.id);
    applyTaskDependencies(editorState.id, editorState.dependencyIds || []);
    syncingRef.current = false;
    emitChange();
    closeEditor();
  };

  return (
    <>
      <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {viewMode === "chart" ? (
          <div
            className="inline-flex items-center gap-1 rounded-[8px] border border-[#d7dfeb] bg-white p-[5px]"
            aria-label="Chart scale"
          >
            {[
              { id: "week", label: "Weeks" },
              { id: "month", label: "Months" },
            ].map((level) => (
              <button
                key={level.id}
                type="button"
                className={
                  zoom === level.id
                    ? "rounded-[8px] bg-[#e8f8ef] px-3.5 py-2 text-sm font-semibold text-[#17b26a] transition duration-200 hover:-translate-y-px"
                    : "rounded-[8px] bg-transparent px-3.5 py-2 text-sm font-semibold text-[#475467] transition duration-200 hover:-translate-y-px"
                }
                onClick={() => onZoomChange(level.id)}
              >
                {level.label}
              </button>
            ))}
          </div>
        ) : null}

        <div
          className="inline-flex items-center gap-1 rounded-[8px] border border-[#d7dfeb] bg-white p-[5px]"
          aria-label="Timeline view mode"
        >
            {[
              { id: "table", label: "Table" },
              { id: "chart", label: "Chart" },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={
                  viewMode === mode.id
                    ? "rounded-[8px] bg-[#e8f8ef] px-3.5 py-2 text-sm font-semibold text-[#17b26a] transition duration-200 hover:-translate-y-px"
                    : "rounded-[8px] bg-transparent px-3.5 py-2 text-sm font-semibold text-[#475467] transition duration-200 hover:-translate-y-px"
                }
                onClick={() => onViewModeChange(mode.id)}
              >
                {mode.label}
            </button>
          ))}
        </div>

        <button
          type="button"
            className="rounded-[8px] bg-[#17b26a] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(23,178,106,0.16)] transition duration-200 hover:-translate-y-px"
            onClick={handleAddTask}
          >
            Add Task
          </button>
        </div>

        <div className="min-h-[680px] overflow-visible bg-white shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
          <div ref={containerRef} className="h-[680px] w-full" />
        </div>
      </div>

      {editorState ? (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-[rgba(7,12,17,0.22)] px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-[760px] overflow-y-auto rounded-[8px] bg-white shadow-[0_24px_64px_rgba(16,24,40,0.24)]">
            <div className="border-b border-[#d7dfeb] px-6 py-4">
              <h3 className="m-0 text-[18px] leading-[1.25] font-semibold text-[#070c11]">
                Edit Timeline Task
              </h3>
            </div>

            <div className="grid gap-4 px-6 py-5">
              <label className="grid gap-2 text-sm font-semibold text-[#475467]">
                Type of Task
                <input
                  className={inputClass}
                  value={editorState.taskType}
                  onChange={(event) =>
                    setEditorState((current) => ({
                      ...current,
                      taskType: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-[#475467]">
                Description
                <textarea
                  className={`${inputClass} min-h-24 resize-y`}
                  value={editorState.text}
                  onChange={(event) =>
                    setEditorState((current) => ({
                      ...current,
                      text: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-[#475467]">
                Owner / Department
                <select
                  className={`app-select ${inputClass}`}
                  value={editorState.ownerRole}
                  onChange={(event) =>
                    setEditorState((current) => ({
                      ...current,
                      ownerRole: event.target.value,
                    }))
                  }
                >
                  <option value="">Select owner / dept</option>
                  {OWNER_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-2 text-sm font-semibold text-[#475467]">
                Assigned Team Members
                <div className="grid max-h-[220px] gap-2 overflow-y-auto rounded-[8px] border border-[#d7dfeb] bg-[#fcfdff] p-3">
                  {assignees.length ? (
                    assignees.map((member) => (
                      <label
                        key={member.id}
                        className="flex items-start gap-3 rounded-[8px] border border-[#e4e7ec] bg-white px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-[#17b26a]"
                          checked={editorState.ownerIds.includes(member.id)}
                          onChange={() => handleToggleOwner(member.id)}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[#070c11]">
                            {member.name}
                          </div>
                          <div className="text-xs text-[#667085]">
                            {[member.department, member.email].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="text-sm font-medium text-[#667085]">
                      Attach project team members first to assign task owners here.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-[#475467]">
                  Start Date
                  <input
                    className={inputClass}
                    type="date"
                    value={editorState.start_date}
                    onChange={(event) =>
                      setEditorState((current) => ({
                        ...current,
                        start_date: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-[#475467]">
                  End Date
                  <input
                    className={inputClass}
                    type="date"
                    value={editorState.end_date}
                    onChange={(event) =>
                      setEditorState((current) => ({
                        ...current,
                        end_date: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-[#475467]">
                Status
                <select
                  className={`app-select ${inputClass}`}
                  value={editorState.status}
                  onChange={(event) =>
                    setEditorState((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  {TASK_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-2 text-sm font-semibold text-[#475467]">
                Task Dependencies
                <div className="grid max-h-[220px] gap-2 overflow-y-auto rounded-[8px] border border-[#d7dfeb] bg-[#fcfdff] p-3">
                  {tasks.data.filter((task) => String(task.id) !== String(editorState.id)).length ? (
                    tasks.data
                      .filter((task) => String(task.id) !== String(editorState.id))
                      .map((task) => (
                        <label
                          key={task.id}
                          className="flex items-start gap-3 rounded-[8px] border border-[#e4e7ec] bg-white px-3 py-2"
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 accent-[#17b26a]"
                            checked={editorState.dependencyIds.includes(String(task.id))}
                            onChange={() => handleToggleDependency(task.id)}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#070c11]">
                              {task.taskType || "General"}
                            </div>
                            <div className="text-xs text-[#667085]">
                              {task.text || "Untitled task"}
                            </div>
                          </div>
                        </label>
                      ))
                  ) : (
                    <div className="text-sm font-medium text-[#667085]">
                      No other tasks available to add as dependencies.
                    </div>
                  )}
                </div>
                <div className="text-xs font-medium text-[#667085]">
                  Select the tasks that must finish before this task can start. Clear all
                  selections to remove dependencies for this task.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-[#d7dfeb] bg-[#fcfdff] px-6 py-4">
              <button
                type="button"
                className="rounded-[8px] border border-[#c5d0de] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] transition duration-200 hover:-translate-y-px"
                onClick={closeEditor}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-[8px] bg-[#17b26a] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(23,178,106,0.16)] transition duration-200 hover:-translate-y-px"
                onClick={handleSaveEditor}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default Gantt;
