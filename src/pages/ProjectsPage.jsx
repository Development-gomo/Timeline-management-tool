import { useState } from "react";
import { Link } from "react-router-dom";

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

function ProjectsPage({ projects }) {
  const [selectedFilter, setSelectedFilter] = useState("active");
  const activeProjects = projects.filter((project) => (project.status || "active") === "active");
  const completedProjects = projects.filter((project) => project.status === "completed");
  const upcomingProjects = projects.filter((project) => project.status === "upcoming");
  const filteredProjects =
    selectedFilter === "completed"
      ? completedProjects
      : selectedFilter === "upcoming"
        ? upcomingProjects
        : activeProjects;

  return (
    <div>
      <section className="mb-[18px] grid grid-cols-1 gap-4 xl:grid-cols-4">
        <StatCard
          label="Active Projects"
          value={activeProjects.length}
          hint="Currently in motion"
          tone="blue"
        />
        <StatCard
          label="Completed Projects"
          value={completedProjects.length}
          hint="Finished deliveries"
          tone="green"
        />
        <StatCard
          label="Upcoming Projects"
          value={upcomingProjects.length}
          hint="Queued to kick off"
          tone="amber"
        />
        <StatCard
          label="Total Projects"
          value={projects.length}
          hint="Across this app"
          tone="red"
        />
      </section>

      <section className="rounded-[8px] border border-[#d7dfeb] bg-white p-[22px] shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
        <div className="mb-[18px] flex flex-col items-start justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <p className="mb-2 text-[0.78rem] font-extrabold uppercase tracking-[0.12em] text-[#17b26a]">
              Project Grid
            </p>
            <h2 className="m-0 text-[18px] leading-[1.25] font-semibold text-[#070c11]">
              All created projects
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="inline-flex items-center gap-1 rounded-[8px] border border-[#d7dfeb] bg-white p-[5px]"
              aria-label="Project status filter"
            >
              {[
                { id: "active", label: "Active" },
                { id: "completed", label: "Completed" },
                { id: "upcoming", label: "Upcoming" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={
                    selectedFilter === filter.id
                      ? "rounded-[8px] bg-[#e8f8ef] px-3.5 py-2 text-sm font-semibold text-[#17b26a] transition duration-200 hover:-translate-y-px"
                      : "rounded-[8px] bg-transparent px-3.5 py-2 text-sm font-semibold text-[#475467] transition duration-200 hover:-translate-y-px"
                  }
                  onClick={() => setSelectedFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <Link
              to="/projects/new"
              className="inline-flex items-center justify-center rounded-[8px] bg-[#17b26a] px-4 py-2.5 text-sm font-semibold text-white no-underline shadow-[0_10px_20px_rgba(23,178,106,0.16)] transition duration-200 hover:-translate-y-px"
            >
              Add New Project
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {filteredProjects.length ? (
            filteredProjects.map((project) => (
              <article
                key={project.id}
                className="grid min-h-[220px] gap-4 rounded-[8px] border border-[#d7dfeb] bg-gradient-to-b from-[rgba(255,255,255,0.98)] to-[rgba(248,250,252,0.98)] p-[18px]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        "inline-flex items-center justify-center rounded-[8px] px-[11px] py-[7px] text-[0.82rem] font-extrabold capitalize",
                        (project.status || "active") === "completed"
                          ? "bg-[#eff8ff] text-[#175cd3]"
                          : (project.status || "active") === "upcoming"
                            ? "bg-[#fffaeb] text-[#b54708]"
                            : "bg-[#ecfdf3] text-[#067647]",
                      ].join(" ")}
                    >
                      {project.status || "active"}
                    </span>
                    <span className="inline-flex items-center justify-center rounded-[8px] bg-[#f2f4f7] px-3 py-2 text-[0.84rem] font-bold text-[#475467]">
                      {project.teamMembers.length} team
                    </span>
                  </div>
                  <Link
                    to={`/projects/${project.id}/edit`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#d7dfeb] bg-white text-[#475467] no-underline transition duration-200 hover:-translate-y-px hover:border-[rgba(23,178,106,0.3)] hover:text-[#17b26a] hover:shadow-[0_8px_16px_rgba(16,24,40,0.08)]"
                    aria-label={`Edit ${project.name}`}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
                      <path
                        d="M4 20h4l9.8-9.8-4-4L4 16v4Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <path
                        d="m12.8 6.2 4 4 1.8-1.8a1.9 1.9 0 0 0 0-2.8l-1.2-1.2a1.9 1.9 0 0 0-2.8 0l-1.8 1.8Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </div>

                <div>
                  <h3 className="mb-2.5 text-[20px] leading-[1.25] font-semibold text-[#070c11]">
                    {project.name}
                  </h3>
                  <p className="m-0 text-[0.95rem] text-[#667085]">
                    {project.description || "No project description added yet."}
                  </p>
                </div>

                <div className="grid gap-3 border-t border-[#d7dfeb] pt-3.5">
                  <div className="flex items-center justify-between gap-3 text-[0.95rem] text-[#667085]">
                    <span>{project.client || "Internal"}</span>
                    <span>
                      {project.timeline.data.length} tasks ·{" "}
                      {
                        project.timeline.data.filter(
                          (task) => !task.isPhase && task.status === "done"
                        ).length
                      }{" "}
                      completed
                    </span>
                  </div>
                  <Link
                    to={`/projects/${project.id}/timeline`}
                    className="inline-flex items-center justify-center rounded-[8px] border border-[#d7dfeb] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] no-underline transition duration-200 hover:-translate-y-px hover:border-[rgba(23,178,106,0.3)] hover:text-[#17b26a]"
                  >
                    View Timeline
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[8px] border border-dashed border-[#c5d0de] bg-[#fbfcfe] p-4 text-[#667085]">
              No {selectedFilter} projects yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default ProjectsPage;
