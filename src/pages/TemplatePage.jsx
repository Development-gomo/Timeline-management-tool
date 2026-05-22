import { useState } from "react";
import { OWNER_ROLE_OPTIONS, TASK_STATUS_OPTIONS } from "../lib/timeline";

const statToneClasses = {
  green: "before:bg-[#17b26a]",
  blue: "before:bg-[#2e90fa]",
  amber: "before:bg-[#f79009]",
  red: "before:bg-[#f04438]",
};

const inputClass =
  "form-field w-full rounded-[8px] border border-[#c5d0de] bg-white px-[14px] py-3 !text-[14px] text-[#070c11] outline-none transition focus:border-[rgba(23,178,106,0.5)] focus:shadow-[0_0_0_4px_rgba(23,178,106,0.08)]";

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

function TemplatePage({
  projects,
  template,
  onTemplateTaskChange,
  onAddTemplateTask,
  onDeleteTemplateTask,
  onReorderTemplateTasks,
  onAddTemplateLink,
  onTemplateLinkChange,
  onDeleteTemplateLink,
}) {
  const [activeTab, setActiveTab] = useState("tasks");
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const scheduledTasks = template.data.filter((task) => task.start_date && task.end_date);

  return (
    <div>
      <section className="mb-[18px] grid grid-cols-1 gap-4 xl:grid-cols-4">
        <StatCard
          label="Template Tasks"
          value={template.data.length}
          hint="Reusable steps in the master workflow"
          tone="green"
        />
        <StatCard
          label="Dependencies"
          value={template.links.length}
          hint="Finish-to-start rules"
          tone="blue"
        />
        <StatCard
          label="Projects Using Template"
          value={projects.length}
          hint="New projects clone this setup"
          tone="amber"
        />
        <StatCard
          label="Scheduled Reference Tasks"
          value={scheduledTasks.length}
          hint="Reference start and end dates in the base plan"
          tone="red"
        />
      </section>

      <section className="rounded-[8px] border border-[#d7dfeb] bg-white p-[22px] shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
        <div>
          {activeTab === "tasks" ? (
            <>
              <div className="mb-3.5 flex items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-[#070c11]">Template Tasks</h3>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <div
                    className="inline-flex items-center gap-1 rounded-[8px] border border-[#d7dfeb] bg-white p-[5px]"
                    aria-label="Template section filter"
                  >
                    {[
                      { id: "tasks", label: "Template Tasks" },
                      { id: "dependencies", label: "Template Dependencies" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        className={
                          activeTab === tab.id
                            ? "rounded-[8px] bg-[#e8f8ef] px-3.5 py-2 text-sm font-bold text-[#17b26a] transition duration-200 hover:-translate-y-px"
                            : "rounded-[8px] bg-transparent px-3.5 py-2 text-sm font-bold text-[#475467] transition duration-200 hover:-translate-y-px"
                        }
                        onClick={() => setActiveTab(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="rounded-[8px] bg-[#17b26a] px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_20px_rgba(23,178,106,0.16)] transition duration-200 hover:-translate-y-px"
                    onClick={onAddTemplateTask}
                  >
                    Add Task
                  </button>
                </div>
              </div>

              <div className="mb-3 hidden rounded-[8px] border border-[#d7dfeb] bg-[#f8fafc] px-4 py-3 text-xs font-extrabold uppercase tracking-[0.08em] text-[#667085] xl:grid xl:grid-cols-[160px_minmax(0,1.8fr)_180px_150px_150px_130px_auto] xl:gap-2">
                <span>Type of Task</span>
                <span>Description</span>
                <span className="text-center">Owner / Dept</span>
                <span className="text-center">Start Date</span>
                <span className="text-center">End Date</span>
                <span className="text-center">Status</span>
                <span className="text-center">Action</span>
              </div>

              <div className="grid gap-3">
                {template.data.map((task) => (
                  <div
                    key={task.id}
                    className={[
                      "grid items-center gap-2 rounded-[8px] border border-[#d7dfeb] bg-[#fcfdff] p-[14px] xl:grid-cols-[160px_minmax(0,1.8fr)_180px_150px_150px_130px_auto]",
                      draggedTaskId === task.id ? "opacity-70" : "",
                    ].join(" ")}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceTaskId =
                        event.dataTransfer.getData("text/plain") || draggedTaskId;
                      onReorderTemplateTasks(sourceTaskId, task.id);
                      setDraggedTaskId(null);
                    }}
                  >
                    <input
                      className={inputClass}
                      value={task.taskType || ""}
                      onChange={(event) =>
                        onTemplateTaskChange(task.id, "taskType", event.target.value)
                      }
                      placeholder="Phase"
                    />
                    <textarea
                      className={`${inputClass} h-[50px] resize-y`}
                      value={task.text}
                      onChange={(event) =>
                        onTemplateTaskChange(task.id, "text", event.target.value)
                      }
                      placeholder="Task description"
                    />
                    <select
                      className={`app-select ${inputClass}`}
                      value={task.ownerRole || ""}
                      onChange={(event) =>
                        onTemplateTaskChange(task.id, "ownerRole", event.target.value)
                      }
                    >
                      <option value="">Select owner / dept</option>
                      {OWNER_ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className={inputClass}
                      type="date"
                      value={task.start_date || ""}
                      onChange={(event) =>
                        onTemplateTaskChange(task.id, "start_date", event.target.value)
                      }
                    />
                    <input
                      className={inputClass}
                      type="date"
                      value={task.end_date || ""}
                      onChange={(event) =>
                        onTemplateTaskChange(task.id, "end_date", event.target.value)
                      }
                    />
                    <div className="gantt-inline-status">
                      <select
                        className={`gantt-status-select gantt-status-${task.status || "pending"}`}
                        value={task.status || "pending"}
                        onChange={(event) =>
                          onTemplateTaskChange(task.id, "status", event.target.value)
                        }
                      >
                        {TASK_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        draggable
                        className="inline-flex h-[46px] w-[46px] cursor-grab items-center justify-center rounded-[8px] border border-[#c5d0de] bg-white text-[#344054] transition duration-200 hover:-translate-y-px active:cursor-grabbing"
                        onDragStart={(event) => {
                          setDraggedTaskId(task.id);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", String(task.id));
                        }}
                        onDragEnd={() => setDraggedTaskId(null)}
                        aria-label={`Reorder ${task.text || "task"}`}
                        title="Drag to reorder task"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                          <path
                            d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-[8px] border border-[#ffd5d2] bg-white text-[#f04438] transition duration-200 hover:-translate-y-px"
                        onClick={() => onDeleteTemplateTask(task.id)}
                        aria-label={`Delete ${task.text || "task"}`}
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
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mb-3.5 flex items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-[#070c11]">Template Dependencies</h3>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <div
                    className="inline-flex items-center gap-1 rounded-[8px] border border-[#d7dfeb] bg-white p-[5px]"
                    aria-label="Template section filter"
                  >
                    {[
                      { id: "tasks", label: "Template Tasks" },
                      { id: "dependencies", label: "Template Dependencies" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        className={
                          activeTab === tab.id
                            ? "rounded-[8px] bg-[#e8f8ef] px-3.5 py-2 text-sm font-bold text-[#17b26a] transition duration-200 hover:-translate-y-px"
                            : "rounded-[8px] bg-transparent px-3.5 py-2 text-sm font-bold text-[#475467] transition duration-200 hover:-translate-y-px"
                        }
                        onClick={() => setActiveTab(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="rounded-[8px] bg-[#17b26a] px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_20px_rgba(23,178,106,0.16)] transition duration-200 hover:-translate-y-px"
                    onClick={onAddTemplateLink}
                  >
                    Add Dependency
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                {template.links.length ? (
                  template.links.map((link) => (
                    <div
                      key={link.id}
                      className="grid items-center gap-2 rounded-[8px] border border-[#d7dfeb] bg-[#fcfdff] p-[14px] xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]"
                    >
                      <select
                        className={`app-select ${inputClass}`}
                        value={link.source}
                        onChange={(event) =>
                          onTemplateLinkChange(link.id, "source", event.target.value)
                        }
                      >
                        {template.data.map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.taskType} · {task.text}
                          </option>
                        ))}
                      </select>
                      <div className="inline-flex w-fit items-center justify-center rounded-[8px] bg-[#f2f4f7] px-3 py-2 text-[0.84rem] font-bold text-[#475467]">
                        Finish to Start
                      </div>
                      <select
                        className={`app-select ${inputClass}`}
                        value={link.target}
                        onChange={(event) =>
                          onTemplateLinkChange(link.id, "target", event.target.value)
                        }
                      >
                        {template.data.map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.taskType} · {task.text}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-[8px] border border-[#ffd5d2] bg-white text-[#f04438] transition duration-200 hover:-translate-y-px"
                        onClick={() => onDeleteTemplateLink(link.id)}
                        aria-label="Delete dependency"
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
                  ))
                ) : (
                  <div className="rounded-[8px] border border-dashed border-[#c5d0de] bg-[#fbfcfe] p-[14px] text-[#667085]">
                    Add finish-to-start dependencies that every new project should inherit.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default TemplatePage;
