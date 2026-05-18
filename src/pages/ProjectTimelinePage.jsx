import { useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import Gantt from "../components/Gantt";

const statToneClasses = {
  green: "before:bg-[#17b26a]",
  blue: "before:bg-[#2e90fa]",
  amber: "before:bg-[#f79009]",
  red: "before:bg-[#f04438]",
};

function StatCard({ label, value, hint, tone = "neutral" }) {
  return (
    <article
      className={[
        "relative overflow-hidden rounded-[8px] border border-[#d7dfeb] bg-white px-5 py-[18px] shadow-[0_8px_24px_rgba(16,24,40,0.06)] before:absolute before:inset-x-0 before:top-0 before:h-1 before:content-['']",
        statToneClasses[tone] || "before:bg-[#d0d5dd]",
      ].join(" ")}
    >
      <p className="mb-3.5 text-sm font-semibold text-[#475467]">{label}</p>
      <strong className="mb-1 block text-[36px] leading-none font-semibold text-[#070c11]">
        {value}
      </strong>
      <span className="text-sm text-[#667085]">{hint}</span>
    </article>
  );
}

function ProjectTimelinePage({ projects, onTimelineChange }) {
  const { projectId } = useParams();
  const project = projects.find((item) => item.id === projectId) ?? null;
  const [zoom, setZoom] = useState("week");
  const [viewMode, setViewMode] = useState("table");

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
    return <Navigate to="/projects" replace />;
  }

  return (
    <div>
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

      <section className="rounded-[8px] border border-[#d7dfeb] bg-white p-[18px] shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
        <Gantt
          tasks={project.timeline}
          zoom={zoom}
          onZoomChange={setZoom}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          assignees={project.teamMembers}
          onTasksChange={(nextTimeline) => onTimelineChange(project.id, nextTimeline)}
        />
      </section>
    </div>
  );
}

export default ProjectTimelinePage;
