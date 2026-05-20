import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import DashboardLayout from "./components/DashboardLayout";
import ProjectTimelinePage from "./pages/ProjectTimelinePage";
import PublicProjectTimelineViewPage from "./pages/PublicProjectTimelineViewPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectCreatePage from "./pages/ProjectCreatePage";
import ProjectEditPage from "./pages/ProjectEditPage";
import TeamMembersPage from "./pages/TeamMembersPage";
import UserManagementPage from "./pages/UserManagementPage";
import MyProfilePage from "./pages/MyProfilePage";
import LogsPage from "./pages/LogsPage";
import TemplatePage from "./pages/TemplatePage";
import LoginPage from "./pages/LoginPage";
import {
  loadPublicProjectTimelineState,
  loadSharedAppState,
  saveSharedAppState,
} from "./lib/appStateStore";
import {
  createManagedAuthUser,
  firebaseAuth,
  firebaseInitError,
  hasFirebaseConfig,
  updateCurrentUserPassword,
} from "./lib/firebase";
import { formatDisplayDate, normalizeStoredTask, TASK_STATUS_LABELS } from "./lib/timeline";

const TEMPLATE_VERSION = 2;
const SUPER_ADMIN_EMAILS = String(import.meta.env.VITE_SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const MASTER_TEMPLATE_TASKS = [
  {
    id: "task-1",
    taskType: "Planning and Prerequisites",
    text: "Design and development timeline",
    ownerRole: "Developer",
    start_date: "2026-03-25",
    end_date: "2026-03-30",
    status: "done",
  },
  {
    id: "task-2",
    taskType: "Planning and Prerequisites",
    text: "New website questionnaire",
    ownerRole: "Designer",
    start_date: "2026-03-25",
    end_date: "2026-03-27",
    status: "done",
  },
  {
    id: "task-3",
    taskType: "Kick-off",
    text: "Design: Kick-off call",
    ownerRole: "Designer",
    start_date: "2026-04-02",
    end_date: "2026-04-02",
    status: "done",
    dependsOn: ["task-1", "task-2"],
  },
  {
    id: "task-4",
    taskType: "Moodboarding",
    text: "Design: Site Moodboarding",
    ownerRole: "Designer",
    start_date: "2026-04-03",
    end_date: "2026-04-07",
    status: "ongoing",
    dependsOn: ["task-3"],
  },
  {
    id: "task-5",
    taskType: "Design Phase",
    text: "Sitemap discussion and finalization",
    ownerRole: "Designer",
    start_date: "2026-04-08",
    end_date: "2026-04-08",
    status: "pending",
    dependsOn: ["task-4"],
  },
  {
    id: "task-6",
    taskType: "Design Phase",
    text: "Home page UI creation",
    ownerRole: "Designer",
    start_date: "2026-04-09",
    end_date: "2026-04-15",
    status: "pending",
    dependsOn: ["task-5"],
  },
  {
    id: "task-7",
    taskType: "Design Phase",
    text: "1st review meeting with client for homepage",
    ownerRole: "Client",
    start_date: "2026-04-16",
    end_date: "2026-04-16",
    status: "pending",
    dependsOn: ["task-6"],
  },
  {
    id: "task-8",
    taskType: "Design Phase",
    text: "Home page feedback/approval",
    ownerRole: "Client",
    start_date: "2026-04-17",
    end_date: "2026-04-20",
    status: "pending",
    dependsOn: ["task-7"],
  },
  {
    id: "task-9",
    taskType: "Design Phase",
    text: "Feedback changes on the homepage (if any)",
    ownerRole: "Designer",
    start_date: "2026-04-20",
    end_date: "2026-04-22",
    status: "pending",
    dependsOn: ["task-8"],
  },
  {
    id: "task-10",
    taskType: "Design Phase",
    text: "Final approval from the client on homepage",
    ownerRole: "Client",
    start_date: "2026-04-23",
    end_date: "2026-04-23",
    status: "pending",
    dependsOn: ["task-9"],
  },
  {
    id: "task-11",
    taskType: "Design Phase",
    text: "Wireframing and Mockup for remaining 3 pages (Product category, Product, Service)",
    ownerRole: "Designer",
    start_date: "2026-04-24",
    end_date: "2026-04-28",
    status: "pending",
    dependsOn: ["task-10"],
  },
  {
    id: "task-12",
    taskType: "Design Phase",
    text: "Final review meeting with client for the remaining 3 pages",
    ownerRole: "Designer",
    start_date: "2026-04-29",
    end_date: "2026-04-29",
    status: "pending",
    dependsOn: ["task-11"],
  },
  {
    id: "task-13",
    taskType: "Design Phase",
    text: "Remaining 3 mockups approval",
    ownerRole: "Client",
    start_date: "2026-04-29",
    end_date: "2026-04-30",
    status: "pending",
    dependsOn: ["task-12"],
  },
  {
    id: "task-14",
    taskType: "Design Phase",
    text: "Send all files to Developer",
    ownerRole: "Designer",
    start_date: "2026-05-04",
    end_date: "2026-05-04",
    status: "pending",
    dependsOn: ["task-13"],
  },
  {
    id: "task-15",
    taskType: "Content Planning",
    text: "Provide with the sheet of sitemap URLs (base language and domain)",
    ownerRole: "Developer",
    start_date: "2026-04-22",
    end_date: "2026-04-22",
    status: "done",
  },
  {
    id: "task-16",
    taskType: "Content Planning",
    text: "Marking the excel sheet with keep, update, or remove",
    ownerRole: "Client",
    start_date: "2026-04-22",
    end_date: "2026-04-30",
    status: "ongoing",
    dependsOn: ["task-15"],
  },
  {
    id: "task-17",
    taskType: "Content Writing",
    text: "Rickard and MPP to write and share all the content for the new website",
    ownerRole: "Client",
    start_date: "2026-04-20",
    end_date: "2026-05-25",
    status: "pending",
    dependsOn: ["task-16"],
  },
  {
    id: "task-18",
    taskType: "Development Phase",
    text: "WordPress Setup (Backend): install and configure WordPress, CPTs, ACF Pro, WPML, SEO and performance plugins, menus, footer widgets, and REST endpoints",
    ownerRole: "Developer",
    start_date: "2026-04-20",
    end_date: "2026-04-22",
    status: "pending",
  },
  {
    id: "task-19",
    taskType: "Development Phase",
    text: "Next.js Setup (Frontend): initialize project, configure Tailwind and SEO, setup multilingual routing, build shared shell, and deploy staging on Vercel",
    ownerRole: "Developer",
    start_date: "2026-04-20",
    end_date: "2026-04-22",
    status: "pending",
  },
  {
    id: "task-20",
    taskType: "Development Phase",
    text: "1st meeting with Designer for homepage and interactions overview",
    ownerRole: "Developer",
    start_date: "2026-04-23",
    end_date: "2026-04-23",
    status: "pending",
    dependsOn: ["task-10", "task-18", "task-19"],
  },
  {
    id: "task-21",
    taskType: "Development Phase",
    text: "Homepage development with responsive (backend + front end) with internal QA",
    ownerRole: "Developer",
    start_date: "2026-04-24",
    end_date: "2026-05-04",
    status: "pending",
    dependsOn: ["task-20"],
  },
  {
    id: "task-22",
    taskType: "Development Phase",
    text: "Meeting with Designer for all mockups and interactions overview",
    ownerRole: "Developer",
    start_date: "2026-05-05",
    end_date: "2026-05-05",
    status: "pending",
    dependsOn: ["task-14", "task-21"],
  },
  {
    id: "task-23",
    taskType: "Development Phase",
    text: "Other 3 templates development with responsive: Product category, Product, and Service with internal QA",
    ownerRole: "Developer",
    start_date: "2026-05-06",
    end_date: "2026-05-15",
    status: "pending",
    dependsOn: ["task-22"],
  },
  {
    id: "task-24",
    taskType: "Development Phase",
    text: "Template development for case study, blog listing, single blog, and related templates with internal QA",
    ownerRole: "Developer",
    start_date: "2026-05-18",
    end_date: "2026-05-21",
    status: "pending",
    dependsOn: ["task-23"],
  },
  {
    id: "task-25",
    taskType: "Development Phase",
    text: "Other templates and pages development with responsive, including about us, contact, thank you, and 404 with internal QA",
    ownerRole: "Developer",
    start_date: "2026-05-22",
    end_date: "2026-05-25",
    status: "pending",
    dependsOn: ["task-24"],
  },
  {
    id: "task-26",
    taskType: "Internal QA",
    text: "Designer UI/UX QA on the templates via a feedback document",
    ownerRole: "Designer",
    start_date: "2026-05-26",
    end_date: "2026-05-27",
    status: "pending",
    dependsOn: ["task-25"],
  },
  {
    id: "task-27",
    taskType: "Launch-prep",
    text: "Access to the hosting server, Cookiebot, GTM, and related launch tools",
    ownerRole: "Client",
    start_date: "2026-05-26",
    end_date: "2026-06-01",
    status: "pending",
    dependsOn: ["task-26"],
  },
  {
    id: "task-28",
    taskType: "Internal QA fixes",
    text: "Fix all the UI/UX feedback pointers",
    ownerRole: "Developer",
    start_date: "2026-05-28",
    end_date: "2026-05-31",
    status: "pending",
    dependsOn: ["task-26"],
  },
  {
    id: "task-29",
    taskType: "Content Addition",
    text: "Content implementation on all pages, products, services, and cases in all required languages",
    ownerRole: "Developer",
    start_date: "2026-06-01",
    end_date: "2026-06-08",
    status: "pending",
    dependsOn: ["task-17", "task-28"],
  },
  {
    id: "task-30",
    taskType: "Pre-migration",
    text: "Ask SEO Analyst to start pre-migration",
    ownerRole: "Developer",
    start_date: "2026-06-08",
    end_date: "2026-06-08",
    status: "pending",
    dependsOn: ["task-29"],
  },
  {
    id: "task-31",
    taskType: "Pre-migration",
    text: "Preparing website migration, including redirection mapping and tracking code backups",
    ownerRole: "SEO Analyst",
    start_date: "2026-06-09",
    end_date: "2026-06-16",
    status: "pending",
    dependsOn: ["task-30"],
  },
  {
    id: "task-32",
    taskType: "Client QA (Round 1)",
    text: "Client QA on the entire website after content addition via a feedback document",
    ownerRole: "Client",
    start_date: "2026-06-09",
    end_date: "2026-06-11",
    status: "pending",
    dependsOn: ["task-29"],
  },
  {
    id: "task-33",
    taskType: "Client final QA fixes",
    text: "Fix all the client feedback pointers",
    ownerRole: "Developer",
    start_date: "2026-06-12",
    end_date: "2026-06-14",
    status: "pending",
    dependsOn: ["task-32"],
  },
  {
    id: "task-34",
    taskType: "Client QA (Final)",
    text: "Client final QA and approval for launch",
    ownerRole: "Client",
    start_date: "2026-06-15",
    end_date: "2026-06-16",
    status: "pending",
    dependsOn: ["task-31", "task-33", "task-27"],
  },
  {
    id: "task-35",
    taskType: "Launch",
    text: "Migrate to live server, DNS, and SSL",
    ownerRole: "Developer",
    start_date: "2026-06-17",
    end_date: "2026-06-17",
    status: "pending",
    dependsOn: ["task-34"],
  },
  {
    id: "task-36",
    taskType: "Post Launch updates",
    text: "SEO post launch activities, caching, essentials checklist, and CMS training to client",
    ownerRole: "Developer",
    start_date: "2026-06-18",
    end_date: "2026-06-26",
    status: "pending",
    dependsOn: ["task-35"],
  },
  {
    id: "task-37",
    taskType: "Post Launch client QA & feedback",
    text: "Client QA and feedback on the live site for any post-launch bugs",
    ownerRole: "Client",
    start_date: "2026-06-29",
    end_date: "2026-07-10",
    status: "pending",
    dependsOn: ["task-36"],
  },
  {
    id: "task-38",
    taskType: "Post launch QA fixes",
    text: "Fix all the post launch feedback pointers and close the website project",
    ownerRole: "Developer",
    start_date: "2026-07-13",
    end_date: "2026-07-20",
    status: "pending",
    dependsOn: ["task-37"],
  },
  {
    id: "task-39",
    taskType: "Website handover",
    text: "CMS KT, new website handover, and close the website project",
    ownerRole: "Developer",
    start_date: "2026-07-21",
    end_date: "2026-07-21",
    status: "pending",
    dependsOn: ["task-38"],
  },
];

const EMPTY_PROJECT_FORM = {
  name: "",
  client: "",
  description: "",
  status: "active",
};

const MAX_AUDIT_LOGS = 1500;

function createId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function appendAuditLog(currentLogs, nextLog) {
  const nextLogs = Array.isArray(currentLogs) ? currentLogs : [];

  if (nextLog.entityType === "timeline") {
    return [nextLog, ...nextLogs].slice(0, MAX_AUDIT_LOGS);
  }

  const lastLog = nextLogs[0];

  if (lastLog) {
    const lastTimestamp = Date.parse(lastLog.createdAt || "");
    const nextTimestamp = Date.parse(nextLog.createdAt || "");
    const isSameWindow =
      Number.isFinite(lastTimestamp) &&
      Number.isFinite(nextTimestamp) &&
      Math.abs(nextTimestamp - lastTimestamp) <= 90 * 1000;
    const isSameFingerprint =
      lastLog.actionKey === nextLog.actionKey &&
      lastLog.userEmail === nextLog.userEmail &&
      lastLog.projectId === nextLog.projectId &&
      lastLog.entityType === nextLog.entityType &&
      lastLog.entityId === nextLog.entityId;

    if (isSameWindow && isSameFingerprint) {
      return [
        {
          ...lastLog,
          ...nextLog,
          id: lastLog.id,
          repeatCount: (lastLog.repeatCount || 1) + 1,
          history: [...(nextLog.history || []), ...(lastLog.history || [])].slice(0, 40),
        },
        ...nextLogs.slice(1),
      ];
    }
  }

  return [nextLog, ...nextLogs].slice(0, MAX_AUDIT_LOGS);
}

function areStringArraysEqual(leftValues = [], rightValues = []) {
  if (leftValues.length !== rightValues.length) {
    return false;
  }

  return leftValues.every((value, index) => value === rightValues[index]);
}

function formatAuditValue(value, type = "text") {
  if (!value && value !== 0) {
    return "Empty";
  }

  if (type === "date") {
    return formatDisplayDate(value) || "Empty";
  }

  if (type === "status") {
    return TASK_STATUS_LABELS[value] || value || "Empty";
  }

  return String(value);
}

function buildTimelineChangeEntries(previousTimeline, nextTimeline) {
  const previousTasks = Array.isArray(previousTimeline?.data) ? previousTimeline.data : [];
  const nextTasks = Array.isArray(nextTimeline?.data) ? nextTimeline.data : [];
  const previousLinks = Array.isArray(previousTimeline?.links) ? previousTimeline.links : [];
  const nextLinks = Array.isArray(nextTimeline?.links) ? nextTimeline.links : [];

  const previousTaskMap = new Map(previousTasks.map((task) => [String(task.id), task]));
  const nextTaskMap = new Map(nextTasks.map((task) => [String(task.id), task]));
  const taskLabelById = new Map(
    nextTasks
      .concat(previousTasks)
      .map((task) => [String(task.id), task.text || task.taskType || "Untitled task"])
  );

  const entries = [];

  nextTasks.forEach((task) => {
    const previousTask = previousTaskMap.get(String(task.id));
    const taskLabel = task.text || task.taskType || "Untitled task";

    if (!previousTask) {
      entries.push({
        kind: "task-added",
        task: taskLabel,
        field: "Task",
        from: "Missing",
        to: "Added",
      });
      return;
    }

    [
      ["taskType", "Type of Task", "text"],
      ["text", "Description", "text"],
      ["ownerRole", "Owner / Dept", "text"],
      ["start_date", "Start Date", "date"],
      ["end_date", "End Date", "date"],
      ["status", "Status", "status"],
    ].forEach(([fieldKey, label, valueType]) => {
      if ((previousTask[fieldKey] || "") !== (task[fieldKey] || "")) {
        entries.push({
          kind: "field-updated",
          task: taskLabel,
          field: label,
          from: formatAuditValue(previousTask[fieldKey], valueType),
          to: formatAuditValue(task[fieldKey], valueType),
        });
      }
    });

    const previousOwnerIds = [...(previousTask.ownerIds || [])].sort();
    const nextOwnerIds = [...(task.ownerIds || [])].sort();
    if (!areStringArraysEqual(previousOwnerIds, nextOwnerIds)) {
      entries.push({
        kind: "field-updated",
        task: taskLabel,
        field: "Assigned Team Members",
        from: previousOwnerIds.length ? `${previousOwnerIds.length} assigned` : "None assigned",
        to: nextOwnerIds.length ? `${nextOwnerIds.length} assigned` : "None assigned",
      });
    }
  });

  previousTasks.forEach((task) => {
    if (!nextTaskMap.has(String(task.id))) {
      entries.push({
        kind: "task-deleted",
        task: task.text || task.taskType || "Untitled task",
        field: "Task",
        from: "Present",
        to: "Deleted",
      });
    }
  });

  const previousOrder = previousTasks.map((task) => String(task.id));
  const nextOrder = nextTasks.map((task) => String(task.id));
  if (!areStringArraysEqual(previousOrder, nextOrder)) {
    entries.push({
      kind: "timeline-order",
      task: "Timeline rows",
      field: "Order",
      from: "Previous order",
      to: "Reordered",
    });
  }

  const previousLinkSet = new Set(
    previousLinks.map((link) => `${String(link.source)}->${String(link.target)}`)
  );
  const nextLinkSet = new Set(nextLinks.map((link) => `${String(link.source)}->${String(link.target)}`));

  nextLinkSet.forEach((linkKey) => {
    if (!previousLinkSet.has(linkKey)) {
      const [sourceId, targetId] = linkKey.split("->");
      entries.push({
        kind: "dependency-added",
        task: taskLabelById.get(targetId) || "Timeline dependency",
        field: "Dependency",
        from: "No dependency",
        to: `${taskLabelById.get(sourceId) || "Another task"} must finish first`,
      });
    }
  });

  previousLinkSet.forEach((linkKey) => {
    if (!nextLinkSet.has(linkKey)) {
      const [sourceId, targetId] = linkKey.split("->");
      entries.push({
        kind: "dependency-removed",
        task: taskLabelById.get(targetId) || "Timeline dependency",
        field: "Dependency",
        from: `${taskLabelById.get(sourceId) || "Another task"} must finish first`,
        to: "Removed dependency",
      });
    }
  });

  return entries.slice(0, 40);
}

function buildProjectUpdateEntries(previousProject, nextProject) {
  if (!previousProject) {
    return [];
  }

  const entries = [];

  [
    ["name", "Project name"],
    ["client", "Owner"],
    ["description", "Description"],
    ["status", "Project status"],
  ].forEach(([fieldKey, label]) => {
    if ((previousProject[fieldKey] || "") !== (nextProject[fieldKey] || "")) {
      entries.push({
        kind: "project-field-updated",
        task: previousProject.name || nextProject.name || "Project",
        field: label,
        from: formatAuditValue(previousProject[fieldKey]),
        to: formatAuditValue(nextProject[fieldKey]),
      });
    }
  });

  const previousMemberIds = [...((previousProject.teamMembers || []).map((member) => member.id))].sort();
  const nextMemberIds = [...((nextProject.teamMembers || []).map((member) => member.id))].sort();

  if (!areStringArraysEqual(previousMemberIds, nextMemberIds)) {
    entries.push({
      kind: "project-team-updated",
      task: previousProject.name || nextProject.name || "Project",
      field: "Attached team members",
      from: `${previousMemberIds.length} attached`,
      to: `${nextMemberIds.length} attached`,
    });
  }

  return entries.slice(0, 20);
}

function resolveAppUserRole(user) {
  if (user?.role === "super_admin") {
    return "super_admin";
  }

  if (user?.role === "admin") {
    return "admin";
  }

  return "user";
}

function formatAppUserRoleLabel(role) {
  if (role === "super_admin") {
    return "Super admin";
  }

  if (role === "admin") {
    return "Admin";
  }

  return "User";
}

function normalizeAppUserStatus(user) {
  return user?.status === "disabled" ? "disabled" : "active";
}

function getCurrentAppUser(authUser, appUsers) {
  const authEmail = String(authUser?.email || "").toLowerCase();
  const authUid = String(authUser?.uid || "");
  if (authUid) {
    const uidMatchedUser = appUsers.find((user) => String(user.uid || "") === authUid);
    if (uidMatchedUser) {
      return uidMatchedUser;
    }
  }

  if (!authEmail) {
    return null;
  }

  return (
    appUsers.find((user) => String(user.email || "").toLowerCase() === authEmail) || null
  );
}

function getCurrentUserRole(authUser, appUsers) {
  const authEmail = String(authUser?.email || "").toLowerCase();
  if (!authEmail) {
    return "user";
  }

  if (SUPER_ADMIN_EMAILS.includes(authEmail)) {
    return "super_admin";
  }

  const matchedUser = getCurrentAppUser(authUser, appUsers);

  return resolveAppUserRole(matchedUser);
}

function canAccessTool(authUser, appUsers) {
  const authEmail = String(authUser?.email || "").toLowerCase();
  if (!authEmail) {
    return false;
  }

  if (SUPER_ADMIN_EMAILS.includes(authEmail)) {
    return true;
  }

  const matchedUser = getCurrentAppUser(authUser, appUsers);
  return Boolean(matchedUser && normalizeAppUserStatus(matchedUser) === "active");
}

function buildDefaultTemplate() {
  return {
    data: MASTER_TEMPLATE_TASKS.map((task) => normalizeStoredTask(task)),
    links: MASTER_TEMPLATE_TASKS.flatMap((task) =>
      (task.dependsOn || []).map((sourceId, index) => ({
        id: `${task.id}-link-${index + 1}`,
        source: sourceId,
        target: task.id,
        type: "0",
      }))
    ),
    version: TEMPLATE_VERSION,
  };
}

function normalizeTimelineState(nextTimeline, fallbackTimeline) {
  if (
    !nextTimeline ||
    !Array.isArray(nextTimeline.data) ||
    !Array.isArray(nextTimeline.links)
  ) {
    return fallbackTimeline;
  }

  return {
    data: nextTimeline.data.map((task) => normalizeStoredTask(task)),
    links: nextTimeline.links.map((link) => ({
      ...link,
      type: "0",
    })),
    version: nextTimeline.version || TEMPLATE_VERSION,
    isCustomized: Boolean(nextTimeline.isCustomized),
  };
}

function isLegacyProjectTimeline(nextTimeline) {
  if (!nextTimeline || !Array.isArray(nextTimeline.data) || !nextTimeline.data.length) {
    return true;
  }

  if (nextTimeline.data.some((task) => String(task.id).startsWith("phase-") || task.parent)) {
    return true;
  }

  const legacyTaskNames = new Set([
    "Discovery & Planning",
    "UX Wireframes",
    "Visual Design",
    "Frontend Development",
    "QA & Launch Prep",
  ]);
  const looksLikeLegacyFiveTaskSeed =
    nextTimeline.data.length === 5 &&
    nextTimeline.data.every((task) => legacyTaskNames.has(task.text));

  if (looksLikeLegacyFiveTaskSeed) {
    return true;
  }

  return nextTimeline.data.some(
    (task) =>
      !("taskType" in task) ||
      !("status" in task) ||
      !Array.isArray(task.ownerIds)
  );
}

function normalizeTemplate(nextTemplate) {
  const fallbackTemplate = buildDefaultTemplate();

  if (
    !nextTemplate ||
    !Array.isArray(nextTemplate.data) ||
    !Array.isArray(nextTemplate.links)
  ) {
    return fallbackTemplate;
  }

  const legacyTemplateIds = new Set(["tpl-1", "tpl-2", "tpl-3", "tpl-4", "tpl-5"]);
  const isLegacyStarterTemplate =
    nextTemplate.data.length === 5 &&
    nextTemplate.data.every((task) => legacyTemplateIds.has(task.id));
  const isLegacyPhaseTemplate = nextTemplate.data.some(
    (task) => String(task.id).startsWith("phase-") || task.parent
  );

  return isLegacyStarterTemplate || isLegacyPhaseTemplate
    ? fallbackTemplate
    : {
        ...normalizeTimelineState(nextTemplate, fallbackTemplate),
        version: TEMPLATE_VERSION,
      };
}

function cloneTemplateForProject(template) {
  const taskIdMap = new Map();

  template.data.forEach((task) => {
    taskIdMap.set(task.id, createId("task"));
  });

  return {
    data: template.data.map((task) =>
      normalizeStoredTask({
        ...task,
        id: taskIdMap.get(task.id),
        ownerIds: [],
        start_date: "",
        end_date: "",
        status: "pending",
        progress: 0,
        unscheduled: true,
      })
    ),
    links: template.links
      .filter((link) => taskIdMap.has(link.source) && taskIdMap.has(link.target))
      .map((link) => ({
        id: createId("link"),
        source: taskIdMap.get(link.source),
        target: taskIdMap.get(link.target),
        type: "0",
      })),
    version: template.version || TEMPLATE_VERSION,
    isCustomized: false,
  };
}

function App() {
  const isPublicTimelinePath =
    typeof window !== "undefined" &&
    /^\/projects\/[^/]+\/timeline\/view\/?$/.test(window.location.pathname);
  const defaultState = useMemo(
    () => ({
      projects: [],
      appUsers: [],
      teamMembers: [],
      logs: [],
      template: buildDefaultTemplate(),
    }),
    []
  );
  const [projects, setProjects] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [template, setTemplate] = useState(buildDefaultTemplate());
  const [projectForm, setProjectForm] = useState(EMPTY_PROJECT_FORM);
  const [isHydrated, setIsHydrated] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authAccessError, setAuthAccessError] = useState("");
  const currentAppUser = useMemo(
    () => getCurrentAppUser(authUser, appUsers),
    [authUser, appUsers]
  );
  const currentUserRole = useMemo(
    () => getCurrentUserRole(authUser, appUsers),
    [authUser, appUsers]
  );
  const isSuperAdmin = currentUserRole === "super_admin";

  const normalizeProjects = (nextProjects, nextTemplate) =>
    nextProjects.map((project) => ({
      ...project,
      status: project.status || "active",
      teamMembers: Array.isArray(project.teamMembers)
        ? project.teamMembers.map((member) => ({
            ...member,
            status: member.status || "current",
          }))
        : [],
      timeline:
        !project.timeline ||
        isLegacyProjectTimeline(project.timeline) ||
        !project.timeline.version ||
        project.timeline.version < (nextTemplate.version || TEMPLATE_VERSION)
          ? cloneTemplateForProject(nextTemplate)
          : normalizeTimelineState(project.timeline, { data: [], links: [] }),
    }));

  const normalizeAppUsers = (nextAppUsers) => {
    const usersByEmail = new Map();

    (Array.isArray(nextAppUsers) ? nextAppUsers : []).forEach((user) => {
      const email = String(user.email || "").trim().toLowerCase();
      if (!email) {
        return;
      }

      usersByEmail.set(email, {
        ...user,
        email,
        name: user.name || email,
        uid: user.uid || "",
        role: resolveAppUserRole(user),
        status: normalizeAppUserStatus(user),
      });
    });

    SUPER_ADMIN_EMAILS.forEach((email) => {
      const existingUser = usersByEmail.get(email);
      usersByEmail.set(email, {
        id: existingUser?.id || `app-user-${email}`,
        email,
        name: existingUser?.name || email.split("@")[0],
        uid: existingUser?.uid || "",
        role: "super_admin",
        status: "active",
      });
    });

    return Array.from(usersByEmail.values());
  };

  const normalizeTeamMembers = (nextTeamMembers) =>
    nextTeamMembers.map((member) => ({
      ...member,
      status: member.status || "current",
    }));

  useEffect(() => {
    if (!firebaseAuth) {
      setIsAuthReady(true);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setAuthUser(nextUser);
      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authUser && !isPublicTimelinePath) {
      setProjects([]);
      setAppUsers([]);
      setTeamMembers([]);
      setLogs([]);
      setTemplate(buildDefaultTemplate());
      setProjectForm(EMPTY_PROJECT_FORM);
      setLoadError("");
      setAuthAccessError("");
      setIsHydrated(false);
      return;
    }

    let isMounted = true;

    async function hydrateState() {
      try {
        const initialState = isPublicTimelinePath && !authUser
          ? await loadPublicProjectTimelineState(
              window.location.pathname.match(/^\/projects\/([^/]+)\/timeline\/view\/?$/)?.[1],
              defaultState
            )
          : await loadSharedAppState(defaultState);
        if (!isMounted) {
          return;
        }

        const normalizedTemplate = normalizeTemplate(initialState.template);

        setProjects(normalizeProjects(initialState.projects, normalizedTemplate));
        setAppUsers(normalizeAppUsers(initialState.appUsers || []));
        setTeamMembers(normalizeTeamMembers(initialState.teamMembers || []));
        setLogs(Array.isArray(initialState.logs) ? initialState.logs : []);
        setTemplate(normalizedTemplate);
        setLoadError("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError(error.message || "Unable to load shared project data.");
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    }

    hydrateState();

    return () => {
      isMounted = false;
    };
  }, [authUser, defaultState, isPublicTimelinePath]);

  useEffect(() => {
    if (!authUser || !isHydrated) {
      return;
    }

    saveSharedAppState({
      projects,
      appUsers,
      teamMembers,
      logs,
      template,
    }).catch((error) => {
      setLoadError(error.message || "Unable to save shared project data.");
    });
  }, [isHydrated, projects, appUsers, teamMembers, logs, template]);

  useEffect(() => {
    if (!authUser || !isHydrated) {
      return;
    }

    if (canAccessTool(authUser, appUsers)) {
      setAuthAccessError("");
      return;
    }

    setAuthAccessError("Your Firebase account is authenticated, but it does not currently have access to this tool.");

    if (firebaseAuth) {
      signOut(firebaseAuth).catch(() => {});
    }
  }, [appUsers, authUser, isHydrated]);

  useEffect(() => {
    if (!authUser || !isHydrated) {
      return;
    }

    setAppUsers((currentUsers) => {
      const authEmail = String(authUser.email || "").toLowerCase();
      const authUid = String(authUser.uid || "");

      let didUpdate = false;
      const nextUsers = currentUsers.map((user) => {
        if (
          String(user.email || "").toLowerCase() === authEmail &&
          !user.uid &&
          authUid
        ) {
          didUpdate = true;
          return {
            ...user,
            uid: authUid,
          };
        }

        return user;
      });

      return didUpdate ? nextUsers : currentUsers;
    });
  }, [authUser, isHydrated]);

  const recordAuditLog = ({
    actionKey,
    actionLabel,
    projectId = "",
    projectName = "",
    entityType,
    entityId = "",
    entityName = "",
    details = "",
    detailsEntries = [],
  }) => {
    const nextLog = {
      id: createId("log"),
      createdAt: new Date().toISOString(),
      actionKey,
      actionLabel,
      userEmail: authUser?.email || "Unknown user",
      userName:
        currentAppUser?.name ||
        authUser?.displayName ||
        authUser?.email ||
        "Unknown user",
      projectId,
      projectName,
      entityType,
      entityId,
      entityName,
      details,
      history: [
        {
          id: createId("log-entry"),
          changedAt: new Date().toISOString(),
          summary: details,
          detailsEntries,
        },
      ],
      repeatCount: 1,
    };

    setLogs((currentLogs) => appendAuditLog(currentLogs, nextLog));
  };

  const handleCreateProject = (draftMembers) => {
    if (!projectForm.name.trim()) {
      return false;
    }

    const newProject = {
      id: createId("project"),
      name: projectForm.name.trim(),
      client: projectForm.client.trim(),
      description: projectForm.description.trim(),
      status: projectForm.status,
      teamMembers: draftMembers.map((member) => ({
        ...member,
        status: member.status || "current",
      })),
      timeline: cloneTemplateForProject(template),
    };

    setProjects((currentProjects) => [newProject, ...currentProjects]);
    recordAuditLog({
      actionKey: "project-created",
      actionLabel: "Created project",
      projectId: newProject.id,
      projectName: newProject.name,
      entityType: "project",
      entityId: newProject.id,
      entityName: newProject.name,
      details: `${newProject.teamMembers.length} team members attached and ${newProject.timeline.data.length} template tasks copied into the project timeline.`,
    });
    setProjectForm(EMPTY_PROJECT_FORM);
    return true;
  };

  const handleUpdateProjectWithMembers = (projectId, updates) => {
    const currentProject = projects.find((project) => project.id === projectId);
    const normalizedUpdates = {
      name: updates.name.trim(),
      client: updates.client.trim(),
      description: updates.description.trim(),
      status: updates.status,
      teamMembers: updates.teamMembers.map((member) => ({
        ...member,
        status: member.status || "current",
      })),
    };
    const detailEntries = buildProjectUpdateEntries(currentProject, normalizedUpdates);
    setProjects((currentProjects) =>
      currentProjects.map((project) => {
        if (project.id !== projectId) {
          return project;
        }

        const validMemberIds = new Set(normalizedUpdates.teamMembers.map((member) => member.id));

        return {
          ...project,
          name: normalizedUpdates.name,
          client: normalizedUpdates.client,
          description: normalizedUpdates.description,
          status: normalizedUpdates.status,
          teamMembers: normalizedUpdates.teamMembers,
          timeline: {
            ...project.timeline,
            data: project.timeline.data.map((task) =>
              normalizeStoredTask({
                ...task,
                ownerIds: (task.ownerIds || []).filter((ownerId) =>
                  validMemberIds.has(ownerId)
                ),
              })
            ),
            isCustomized: true,
          },
        };
      })
    );
    recordAuditLog({
      actionKey: "project-updated",
      actionLabel: "Updated project details",
      projectId,
      projectName: normalizedUpdates.name || currentProject?.name || "Project",
      entityType: "project",
      entityId: projectId,
      entityName: normalizedUpdates.name || currentProject?.name || "Project",
      details: detailEntries.length
        ? `Updated ${detailEntries.length} project detail${detailEntries.length > 1 ? "s" : ""}.`
        : `${normalizedUpdates.teamMembers.length} team members now attached to the project.`,
      detailsEntries: detailEntries,
    });
  };

  const handleProjectTimelineChange = (projectId, nextTimeline) => {
    let nextLogPayload = null;

    setProjects((currentProjects) => {
      const currentProject = currentProjects.find((project) => project.id === projectId);
      const normalizedTimeline = normalizeTimelineState(
        nextTimeline,
        currentProject?.timeline || { data: [], links: [] }
      );

      let detailEntries = [];

      try {
        detailEntries = buildTimelineChangeEntries(currentProject?.timeline, normalizedTimeline);
      } catch {
        detailEntries = [];
      }

      if (!detailEntries.length) {
        detailEntries = [
          {
            kind: "timeline-summary",
            task: currentProject?.name || "Project timeline",
            field: "Summary",
            from: `${currentProject?.timeline?.data?.length || 0} tasks and ${currentProject?.timeline?.links?.length || 0} dependencies`,
            to: `${normalizedTimeline.data?.length || 0} tasks and ${normalizedTimeline.links?.length || 0} dependencies`,
          },
        ];
      }

      nextLogPayload = {
        actionKey: `project-timeline-updated-${projectId}-${Date.now()}`,
        actionLabel: "Updated project timeline",
        projectId,
        projectName: currentProject?.name || "Project",
        entityType: "timeline",
        entityId: projectId,
        entityName: currentProject?.name || "Project timeline",
        details: `${normalizedTimeline.data?.length || 0} tasks and ${normalizedTimeline.links?.length || 0} dependencies are currently stored for this project timeline.`,
        detailsEntries: detailEntries,
      };

      return currentProjects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              timeline: {
                ...normalizedTimeline,
                version: project.timeline.version || TEMPLATE_VERSION,
                isCustomized: true,
              },
            }
          : project
      );
    });

    if (nextLogPayload) {
      recordAuditLog(nextLogPayload);
    }
  };

  const handleDeleteProject = (projectId) => {
    if (currentUserRole === "user") {
      return false;
    }

    const currentProject = projects.find((project) => project.id === projectId);
    setProjects((currentProjects) =>
      currentProjects.filter((project) => project.id !== projectId)
    );
    if (currentProject) {
      recordAuditLog({
        actionKey: "project-deleted",
        actionLabel: "Deleted project",
        projectId: currentProject.id,
        projectName: currentProject.name,
        entityType: "project",
        entityId: currentProject.id,
        entityName: currentProject.name,
        details: `Removed the project and its ${currentProject.timeline.data.length} related timeline tasks from the tool.`,
      });
    }

    return true;
  };

  const handleAddGlobalTeamMember = (memberInput) => {
    if (!memberInput.name.trim()) {
      return false;
    }

    const nextMember = {
      id: createId("team-member"),
      name: memberInput.name.trim(),
      email: memberInput.email.trim(),
      department: memberInput.department.trim(),
      status: memberInput.status || "current",
    };

    setTeamMembers((currentMembers) => [
      nextMember,
      ...currentMembers,
    ]);
    recordAuditLog({
      actionKey: "team-member-created",
      actionLabel: "Added team member",
      entityType: "team-member",
      entityId: nextMember.id,
      entityName: nextMember.name,
      details: `${nextMember.status === "ex" ? "Ex-team member" : "Current team member"} in ${nextMember.department || "No department"}.`,
    });

    return true;
  };

  const handleUpdateGlobalTeamMember = (memberId, updates) => {
    setTeamMembers((currentMembers) =>
      currentMembers.map((member) =>
        member.id === memberId
          ? {
              ...member,
              name: updates.name,
              email: updates.email,
              department: updates.department,
              status: updates.status,
            }
          : member
      )
    );
    recordAuditLog({
      actionKey: "team-member-updated",
      actionLabel: "Updated team member",
      entityType: "team-member",
      entityId: memberId,
      entityName: updates.name || "Team member",
      details: `${updates.status === "ex" ? "Marked as ex-team member" : "Marked as current team member"}${updates.department ? ` in ${updates.department}` : ""}.`,
    });
  };

  const handleAddAppUser = async (userInput) => {
    if (!userInput.name.trim() || !userInput.email.trim() || !userInput.password?.trim()) {
      return false;
    }

    const normalizedEmail = userInput.email.trim().toLowerCase();
    if (appUsers.some((user) => String(user.email || "").toLowerCase() === normalizedEmail)) {
      throw new Error("This app user already exists in the tool.");
    }

    const authProvisionResult = await createManagedAuthUser(
      normalizedEmail,
      userInput.password.trim()
    );
    let nextRole = "user";
    if (currentUserRole === "super_admin") {
      nextRole = resolveAppUserRole({ role: userInput.role });
    } else if (currentUserRole === "admin" && userInput.role === "admin") {
      nextRole = "admin";
    }

    const nextUser = {
      id: createId("app-user"),
      name: userInput.name.trim(),
      email: normalizedEmail,
      uid: authProvisionResult.uid || "",
      role: nextRole,
      status: userInput.status === "disabled" ? "disabled" : "active",
    };

    setAppUsers((currentUsers) => [nextUser, ...currentUsers]);
    recordAuditLog({
      actionKey: "app-user-created",
      actionLabel: "Added app user",
      entityType: "app-user",
      entityId: nextUser.id,
      entityName: nextUser.name,
      details: authProvisionResult.existingAccount
        ? `${nextUser.email} already existed in Firebase Auth. Access was added in the tool and a password reset email was sent.`
        : `${nextUser.email} was created in Firebase Auth and ${formatAppUserRoleLabel(nextUser.role)} access was added.`,
      detailsEntries: [
        {
          task: nextUser.name,
          field: "Firebase UID",
          from: "Missing",
          to: nextUser.uid || "Will sync on first login",
        },
        {
          task: nextUser.name,
          field: "Access role",
          from: "Missing",
          to: formatAppUserRoleLabel(nextUser.role),
        },
        {
          task: nextUser.name,
          field: "Access status",
          from: "Missing",
          to: nextUser.status === "disabled" ? "Disabled" : "Active",
        },
      ],
    });

    return true;
  };

  const handleUpdateAppUser = (userId, updates) => {
    const previousUser = appUsers.find((user) => user.id === userId);
    if (!previousUser) {
      return false;
    }

    if (currentUserRole === "user") {
      return false;
    }

    if (currentUserRole === "admin" && previousUser.role !== "user") {
      return false;
    }

    if (previousUser.role === "super_admin" && !isSuperAdmin) {
      return false;
    }

    let nextRole = previousUser.role || "user";
    if (isSuperAdmin) {
      nextRole = resolveAppUserRole({ role: updates.role });
    } else if (currentUserRole === "admin" && previousUser.role === "user") {
      nextRole = updates.role === "admin" ? "admin" : "user";
    }
    const nextStatus = updates.status === "disabled" ? "disabled" : "active";
    const nextName = updates.name.trim();

    setAppUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === userId
          ? {
              ...user,
              name: nextName,
              role: nextRole,
              status: nextStatus,
            }
          : user
      )
    );

    const detailEntries = [];
    if ((previousUser.name || "") !== nextName) {
      detailEntries.push({
        task: nextName || previousUser.name,
        field: "Name",
        from: previousUser.name,
        to: nextName,
      });
    }
    if (previousUser.role !== nextRole) {
      detailEntries.push({
        task: nextName || previousUser.name,
        field: "Access role",
        from: formatAppUserRoleLabel(previousUser.role),
        to: formatAppUserRoleLabel(nextRole),
      });
    }
    if (previousUser.status !== nextStatus) {
      detailEntries.push({
        task: nextName || previousUser.name,
        field: "Access status",
        from: previousUser.status === "disabled" ? "Disabled" : "Active",
        to: nextStatus === "disabled" ? "Disabled" : "Active",
      });
    }

    recordAuditLog({
      actionKey: "app-user-updated",
      actionLabel: "Updated app user",
      entityType: "app-user",
      entityId: userId,
      entityName: nextName || previousUser.name,
      details: detailEntries.length
        ? `Updated ${detailEntries.length} access detail${detailEntries.length > 1 ? "s" : ""}.`
        : `Reviewed access for ${nextName || previousUser.name}.`,
      detailsEntries: detailEntries,
    });

    return true;
  };

  const handleDeleteAppUser = (userId) => {
    const currentUser = appUsers.find((user) => user.id === userId);
    if (!currentUser) {
      return false;
    }

    const isDeletingSelf =
      String(currentUser.email || "").toLowerCase() === String(authUser?.email || "").toLowerCase();
    if (isDeletingSelf) {
      return false;
    }

    if (currentUserRole === "user") {
      return false;
    }

    if (currentUserRole === "admin" && currentUser.role !== "user") {
      return false;
    }

    if (currentUser.role === "super_admin" && !isSuperAdmin) {
      return false;
    }

    setAppUsers((currentUsers) => currentUsers.filter((user) => user.id !== userId));
    recordAuditLog({
      actionKey: "app-user-deleted",
      actionLabel: "Removed app user",
      entityType: "app-user",
      entityId: userId,
      entityName: currentUser.name,
      details: `Removed ${currentUser.email} from the tool access directory. The Firebase Auth account remains in Firebase unless removed separately.`,
    });

    return true;
  };

  const handleDeleteLog = (logId) => {
    if (!isSuperAdmin) {
      return;
    }

    setLogs((currentLogs) => currentLogs.filter((log) => log.id !== logId));
  };

  const handleUpdateCurrentPassword = async (password) => {
    await updateCurrentUserPassword(password);
    recordAuditLog({
      actionKey: "profile-password-updated",
      actionLabel: "Updated password",
      entityType: "profile",
      entityId: authUser?.uid || authUser?.email || "current-user",
      entityName: authUser?.email || "Current user",
      details: "Updated account password from My Profile.",
    });
  };

  const handleTemplateTaskChange = (taskId, field, value) => {
    const currentTask = template.data.find((task) => task.id === taskId);
    setTemplate((currentTemplate) => ({
      ...currentTemplate,
      data: currentTemplate.data.map((task) =>
        task.id === taskId ? normalizeStoredTask({ ...task, [field]: value }) : task
      ),
    }));
    recordAuditLog({
      actionKey: `template-task-updated-${field}`,
      actionLabel: "Updated template task",
      entityType: "template-task",
      entityId: taskId,
      entityName: currentTask?.text || "Template task",
      details: `Changed ${field.replaceAll("_", " ")} for ${currentTask?.text || "a template task"}.`,
    });
  };

  const handleAddTemplateTask = () => {
    const nextTask = normalizeStoredTask({
      id: createId("tpl"),
      taskType: "New Phase",
      text: "New template task",
      ownerRole: "",
      ownerIds: [],
      start_date: "",
      end_date: "",
      status: "pending",
      progress: 0,
    });

    setTemplate((currentTemplate) => ({
      ...currentTemplate,
      data: [...currentTemplate.data, nextTask],
    }));
    recordAuditLog({
      actionKey: "template-task-added",
      actionLabel: "Added template task",
      entityType: "template-task",
      entityId: nextTask.id,
      entityName: nextTask.text,
      details: `Added a new base template task under ${nextTask.taskType}.`,
    });
  };

  const handleDeleteTemplateTask = (taskId) => {
    const currentTask = template.data.find((task) => task.id === taskId);
    setTemplate((currentTemplate) => ({
      data: currentTemplate.data.filter((task) => task.id !== taskId),
      links: currentTemplate.links.filter(
        (link) => link.source !== taskId && link.target !== taskId
      ),
    }));
    if (currentTask) {
      recordAuditLog({
        actionKey: "template-task-deleted",
        actionLabel: "Deleted template task",
        entityType: "template-task",
        entityId: taskId,
        entityName: currentTask.text,
        details: `Removed the template task and any dependencies connected to it.`,
      });
    }
  };

  const handleReorderTemplateTasks = (activeTaskId, overTaskId) => {
    if (!activeTaskId || !overTaskId || activeTaskId === overTaskId) {
      return;
    }

    setTemplate((currentTemplate) => {
      const currentIndex = currentTemplate.data.findIndex(
        (task) => task.id === activeTaskId
      );
      const nextIndex = currentTemplate.data.findIndex((task) => task.id === overTaskId);

      if (currentIndex === -1 || nextIndex === -1) {
        return currentTemplate;
      }

      const nextData = [...currentTemplate.data];
      const [movedTask] = nextData.splice(currentIndex, 1);
      nextData.splice(nextIndex, 0, movedTask);

      return {
        ...currentTemplate,
        data: nextData,
      };
    });
    const activeTask = template.data.find((task) => task.id === activeTaskId);
    const overTask = template.data.find((task) => task.id === overTaskId);
    recordAuditLog({
      actionKey: "template-tasks-reordered",
      actionLabel: "Reordered template tasks",
      entityType: "template",
      entityId: "base-template",
      entityName: "Base Timeline Template",
      details: `Moved ${activeTask?.text || "a template task"} near ${overTask?.text || "another task"} in the base task order.`,
    });
  };

  const handleAddTemplateLink = () => {
    if (template.data.length < 2) {
      return;
    }

    const nextLink = {
      id: createId("tpl-link"),
      source: template.data[0].id,
      target: template.data[1].id,
      type: "0",
    };

    setTemplate((currentTemplate) => ({
      ...currentTemplate,
      links: [...currentTemplate.links, nextLink],
    }));
    recordAuditLog({
      actionKey: "template-dependency-added",
      actionLabel: "Added template dependency",
      entityType: "template-dependency",
      entityId: nextLink.id,
      entityName: "Finish to Start dependency",
      details: `Added a new base dependency between template tasks.`,
    });
  };

  const handleTemplateLinkChange = (linkId, field, value) => {
    setTemplate((currentTemplate) => ({
      ...currentTemplate,
      links: currentTemplate.links.map((link) =>
        link.id === linkId ? { ...link, [field]: value } : link
      ),
    }));
    recordAuditLog({
      actionKey: `template-dependency-updated-${field}`,
      actionLabel: "Updated template dependency",
      entityType: "template-dependency",
      entityId: linkId,
      entityName: "Finish to Start dependency",
      details: `Changed the ${field} task for a base template dependency.`,
    });
  };

  const handleDeleteTemplateLink = (linkId) => {
    setTemplate((currentTemplate) => ({
      ...currentTemplate,
      links: currentTemplate.links.filter((link) => link.id !== linkId),
    }));
    recordAuditLog({
      actionKey: "template-dependency-deleted",
      actionLabel: "Deleted template dependency",
      entityType: "template-dependency",
      entityId: linkId,
      entityName: "Finish to Start dependency",
      details: `Removed a base template dependency.`,
    });
  };

  const handleLogin = async ({ email, password }) => {
    if (!firebaseAuth) {
      throw new Error("Firebase auth is not configured yet.");
    }

    setAuthAccessError("");
    await setPersistence(firebaseAuth, browserLocalPersistence);
    await signInWithEmailAndPassword(firebaseAuth, email, password);
  };

  const handleLogout = async () => {
    if (!firebaseAuth) {
      return;
    }

    await signOut(firebaseAuth);
  };

  if (!isAuthReady && !isPublicTimelinePath) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f7fb] px-6">
        <div className="rounded-[8px] border border-[#d7dfeb] bg-white px-6 py-5 text-sm text-[#667085] shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
          Checking your session...
        </div>
      </div>
    );
  }

  if ((authUser || isPublicTimelinePath) && !isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f7fb] px-6">
        <div className="rounded-[8px] border border-[#d7dfeb] bg-white px-6 py-5 text-sm text-[#667085] shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
          Loading project timeline...
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          authUser && canAccessTool(authUser, appUsers) ? (
            <Navigate to="/projects" replace />
          ) : (
            <LoginPage
              onLogin={handleLogin}
              authConfigReady={hasFirebaseConfig}
              authInitError={firebaseInitError}
              authAccessError={authAccessError}
            />
          )
        }
      />
      <Route
        path="/projects/:projectId/timeline/view"
        element={<PublicProjectTimelineViewPage projects={projects} />}
      />
      <Route
        element={
          authUser && canAccessTool(authUser, appUsers) ? (
            <DashboardLayout
              loadError={loadError}
              projects={projects}
              currentUserRole={currentUserRole}
              onLogout={handleLogout}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route path="/projects" element={<ProjectsPage projects={projects} />} />
        <Route
          path="/projects/new"
          element={
            <ProjectCreatePage
              projectForm={projectForm}
              setProjectForm={setProjectForm}
              teamMembers={teamMembers}
              onCreateProject={handleCreateProject}
            />
          }
        />
        <Route
          path="/projects/:projectId/edit"
          element={
            <ProjectEditPage
              projects={projects}
              teamMembers={teamMembers}
              canDeleteProject={currentUserRole !== "user"}
              onUpdateProjectBasics={handleUpdateProjectWithMembers}
              onDeleteProject={handleDeleteProject}
            />
          }
        />
        <Route
          path="/projects/:projectId/timeline"
          element={
            <ProjectTimelinePage
              projects={projects}
              onTimelineChange={handleProjectTimelineChange}
            />
          }
        />
        <Route
          path="/user-management"
          element={
            <UserManagementPage
              appUsers={appUsers}
              currentUserEmail={String(authUser?.email || "").toLowerCase()}
              currentUserRole={currentUserRole}
              isSuperAdmin={isSuperAdmin}
              onAddAppUser={handleAddAppUser}
              onUpdateAppUser={handleUpdateAppUser}
              onDeleteAppUser={handleDeleteAppUser}
            />
          }
        />
        <Route
          path="/team-members"
          element={
            <TeamMembersPage
              teamMembers={teamMembers}
              onAddTeamMember={handleAddGlobalTeamMember}
              onUpdateTeamMember={handleUpdateGlobalTeamMember}
            />
          }
        />
        <Route
          path="/my-profile"
          element={
            <MyProfilePage
              currentUserEmail={String(authUser?.email || "").toLowerCase()}
              onUpdatePassword={handleUpdateCurrentPassword}
            />
          }
        />
        <Route
          path="/logs"
          element={
            <LogsPage
              logs={logs}
              projects={projects}
              appUsers={appUsers}
              teamMembers={teamMembers}
              isSuperAdmin={isSuperAdmin}
              onDeleteLog={handleDeleteLog}
            />
          }
        />
        <Route
          path="/timeline-template"
          element={
            <TemplatePage
              projects={projects}
              template={template}
              onTemplateTaskChange={handleTemplateTaskChange}
              onAddTemplateTask={handleAddTemplateTask}
              onDeleteTemplateTask={handleDeleteTemplateTask}
              onReorderTemplateTasks={handleReorderTemplateTasks}
              onAddTemplateLink={handleAddTemplateLink}
              onTemplateLinkChange={handleTemplateLinkChange}
              onDeleteTemplateLink={handleDeleteTemplateLink}
            />
          }
        />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
