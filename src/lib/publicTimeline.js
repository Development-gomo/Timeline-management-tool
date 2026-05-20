export function sanitizePublicProjectSlug(value) {
  return String(value || "project")
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function getPublicTimelineProjectId(project) {
  const projectId = String(project?.id || "");
  const publicSlug = sanitizePublicProjectSlug(project?.name || projectId);

  if (projectId.startsWith("project-")) {
    return `${publicSlug}-${projectId.slice("project-".length)}`;
  }

  return `${publicSlug}-${projectId}`;
}

export function getProjectIdFromPublicTimelineId(publicProjectId) {
  const lookupId = String(publicProjectId || "");
  const uuidMatch = lookupId.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
  );

  if (uuidMatch) {
    return `project-${uuidMatch[1]}`;
  }

  return lookupId;
}

export function findProjectByPublicTimelineId(projects, publicProjectId) {
  const lookupId = String(publicProjectId || "");
  const projectId = getProjectIdFromPublicTimelineId(lookupId);

  return (
    projects.find((project) => getPublicTimelineProjectId(project) === lookupId) ||
    projects.find((project) => String(project.id) === lookupId) ||
    projects.find((project) => String(project.id) === projectId) ||
    null
  );
}
