import { useState } from "react";
import { useNavigate } from "react-router-dom";

const labelClass = "grid gap-2 text-sm font-bold text-[#475467]";
const inputClass =
  "form-field w-full rounded-[8px] border border-[#c5d0de] bg-white px-[14px] py-3 text-sm text-[#070c11] outline-none transition focus:border-[rgba(23,178,106,0.5)] focus:shadow-[0_0_0_4px_rgba(23,178,106,0.08)]";
const panelClass = "rounded-[8px] border border-[#d7dfeb] bg-white p-[18px]";

function ProjectCreatePage({
  projectForm,
  setProjectForm,
  teamMembers,
  onCreateProject,
}) {
  const navigate = useNavigate();
  const [draftMembers, setDraftMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const availableMembers = teamMembers.filter(
    (member) => !draftMembers.some((draftMember) => draftMember.id === member.id)
  );

  const handleAddDraftMember = () => {
    const memberToAdd = availableMembers.find((member) => member.id === selectedMemberId);
    if (!memberToAdd) {
      return;
    }

    setDraftMembers((currentMembers) => [...currentMembers, memberToAdd]);
    setSelectedMemberId("");
  };

  const handleDeleteMember = (memberId) => {
    setDraftMembers((currentMembers) =>
      currentMembers.filter((member) => member.id !== memberId)
    );
  };

  const handleSubmitProject = (event) => {
    event.preventDefault();
    const didCreate = onCreateProject(draftMembers);
    if (!didCreate) {
      return;
    }

    setDraftMembers([]);
    navigate("/projects");
  };

  return (
    <div>
      <section className="overflow-hidden rounded-[8px] border border-[#d7dfeb] bg-white shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
        <form className="grid" onSubmit={handleSubmitProject}>
          <div className={panelClass}>
            <h3 className="mb-3.5 text-lg font-bold text-[#070c11]">
              Project Information
            </h3>

            <label className={labelClass}>
              Project name
              <input
                className={inputClass}
                value={projectForm.name}
                onChange={(event) =>
                  setProjectForm((currentForm) => ({
                    ...currentForm,
                    name: event.target.value,
                  }))
                }
                placeholder="Client name"
              />
            </label>

            <label className={`${labelClass} mt-3`}>
              Owner
              <input
                className={inputClass}
                value={projectForm.client}
                onChange={(event) =>
                  setProjectForm((currentForm) => ({
                    ...currentForm,
                    client: event.target.value,
                  }))
                }
                placeholder="GO MO Group / InnoSearch"
              />
            </label>

            <label className={`${labelClass} mt-3`}>
              Project status
              <select
                className={`app-select ${inputClass}`}
                value={projectForm.status}
                onChange={(event) =>
                  setProjectForm((currentForm) => ({
                    ...currentForm,
                    status: event.target.value,
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="upcoming">Upcoming</option>
              </select>
            </label>

            <label className={`${labelClass} mt-3`}>
              Description
              <textarea
                className={`${inputClass} min-h-24 resize-y`}
                value={projectForm.description}
                onChange={(event) =>
                  setProjectForm((currentForm) => ({
                    ...currentForm,
                    description: event.target.value,
                  }))
                }
                placeholder="Short summary of scope and delivery needs"
              />
            </label>
          </div>

          <div className={`${panelClass} border-t border-[#d7dfeb]`}>
            <div className="mb-3.5 flex items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-[#070c11]">Team Members</h3>
              <span className="inline-flex items-center justify-center rounded-[8px] bg-[#f2f4f7] px-3 py-2 text-[0.84rem] font-bold text-[#475467]">
                {draftMembers.length} attached
              </span>
            </div>

            <div>
              <div className="grid grid-cols-1 gap-2 xl:grid-cols-4">
                <select
                  className={`app-select xl:col-span-3 ${inputClass}`}
                  value={selectedMemberId}
                  onChange={(event) => setSelectedMemberId(event.target.value)}
                >
                  <option value="">Select from team member directory</option>
                  {availableMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} · {member.department || "No department"} ·{" "}
                      {member.status === "ex" ? "Ex-Team Member" : "Current Team Member"}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rounded-[8px] bg-[#17b26a] px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_20px_rgba(23,178,106,0.16)] transition duration-200 hover:-translate-y-px"
                  onClick={handleAddDraftMember}
                >
                  Add Member
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-3">
              {draftMembers.length ? (
                draftMembers.map((member) => (
                  <div
                    key={member.id}
                    className="grid grid-cols-1 items-center gap-2 rounded-[8px] border border-[#d7dfeb] bg-[#fcfdff] p-[14px] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)_180px_auto]"
                  >
                    <div className="text-sm font-bold text-[#070c11]">{member.name}</div>
                    <div className="text-sm text-[#667085]">{member.email || "No email"}</div>
                    <div className="text-sm text-[#667085]">
                      {member.department || "No department"}
                    </div>
                    <div className="text-sm text-[#667085]">
                      {member.status === "ex" ? "Ex-Team Member" : "Current Team Member"}
                    </div>
                    <button
                      type="button"
                      className="rounded-[8px] border border-[#ffd5d2] bg-white px-4 py-2.5 text-sm font-bold text-[#f04438] transition duration-200 hover:-translate-y-px"
                      onClick={() => handleDeleteMember(member.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-[8px] border border-dashed border-[#c5d0de] bg-[#fbfcfe] p-[14px] text-[#667085]">
                  Pick team members from the shared directory to attach them to this
                  project.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-[#d7dfeb] bg-[#fcfdff] px-[22px] py-[18px]">
            <button
              type="button"
              className="rounded-[8px] border border-[#c5d0de] bg-white px-4 py-2.5 text-sm font-bold text-[#344054] transition duration-200 hover:-translate-y-px"
              onClick={() => navigate("/projects")}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-[8px] bg-[#17b26a] px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_20px_rgba(23,178,106,0.16)] transition duration-200 hover:-translate-y-px"
            >
              Create Project
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ProjectCreatePage;
