import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

const labelClass = "grid gap-2 text-sm font-semibold text-[#475467]";
const inputClass =
  "form-field w-full rounded-[8px] border border-[#c5d0de] bg-white px-[14px] py-3 text-sm text-[#070c11] outline-none transition focus:border-[rgba(23,178,106,0.5)] focus:shadow-[0_0_0_4px_rgba(23,178,106,0.08)]";

function ProjectEditPage({
  projects,
  teamMembers,
  canDeleteProject = false,
  onUpdateProjectBasics,
  onDeleteProject,
}) {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const project = projects.find((item) => item.id === projectId) ?? null;
  const [formState, setFormState] = useState({
    name: "",
    client: "",
    description: "",
    status: "active",
  });
  const [memberForm, setMemberForm] = useState({
    id: "",
  });
  const [draftMembers, setDraftMembers] = useState([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!project) {
      return;
    }

    setFormState({
      name: project.name || "",
      client: project.client || "",
      description: project.description || "",
      status: project.status || "active",
    });
    setDraftMembers(project.teamMembers || []);
    setMemberForm({
      id: "",
    });
  }, [project]);

  useEffect(() => {
    if (!isDeleteConfirmOpen) {
      return undefined;
    }

    const handleEscapeClose = (event) => {
      if (event.key === "Escape") {
        setIsDeleteConfirmOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscapeClose);
    return () => document.removeEventListener("keydown", handleEscapeClose);
  }, [isDeleteConfirmOpen]);

  if (!project) {
    return <Navigate to="/projects" replace />;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formState.name.trim()) {
      return;
    }

    onUpdateProjectBasics(project.id, {
      ...formState,
      teamMembers: draftMembers,
    });
    navigate("/projects");
  };

  const availableMembers = teamMembers.filter(
    (member) => !draftMembers.some((draftMember) => draftMember.id === member.id)
  );

  const handleAddDraftMember = () => {
    const memberToAdd = availableMembers.find((member) => member.id === memberForm.id);
    if (!memberToAdd) {
      return;
    }

    setDraftMembers((currentMembers) => [...currentMembers, memberToAdd]);
    setMemberForm({
      id: "",
    });
  };

  const handleDeleteMember = (memberId) => {
    setDraftMembers((currentMembers) =>
      currentMembers.filter((member) => member.id !== memberId)
    );
  };

  const handleConfirmDelete = () => {
    const didDelete = onDeleteProject(project.id);
    if (didDelete) {
      navigate("/projects");
    }
  };

  return (
    <div>
      <section className="overflow-hidden rounded-[8px] border border-[#d7dfeb] bg-white shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
        <form className="grid" onSubmit={handleSubmit}>
          <div className="rounded-[8px] bg-white p-[18px]">
            <h3 className="mb-3.5 text-lg font-semibold text-[#070c11]">
              Project Information
            </h3>

            <label className={labelClass}>
              Project name
              <input
                className={inputClass}
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Client name"
              />
            </label>

            <label className={`${labelClass} mt-3`}>
              Owner
              <input
                className={inputClass}
                value={formState.client}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, client: event.target.value }))
                }
                placeholder="GO MO Group / InnoSearch"
              />
            </label>

            <label className={`${labelClass} mt-3`}>
              Project status
              <select
                className={`app-select ${inputClass}`}
                value={formState.status}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, status: event.target.value }))
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
                value={formState.description}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Short summary of scope and delivery needs"
              />
            </label>
          </div>

          <div className="rounded-[8px] border-t border-[#d7dfeb] bg-white p-[18px]">
            <div className="mb-3.5 flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-[#070c11]">Team Members</h3>
              <span className="inline-flex items-center justify-center rounded-[8px] bg-[#f2f4f7] px-3 py-2 text-[0.84rem] font-bold text-[#475467]">
                {draftMembers.length} attached
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 xl:grid-cols-4">
              <select
                className={`app-select xl:col-span-3 ${inputClass}`}
                value={memberForm.id}
                onChange={(event) =>
                  setMemberForm((current) => ({ ...current, id: event.target.value }))
                }
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
                className="rounded-[8px] bg-[#17b26a] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(23,178,106,0.16)] transition duration-200 hover:-translate-y-px"
                onClick={handleAddDraftMember}
              >
                Add Member
              </button>
            </div>

            <div className="mt-3 grid gap-3">
              {draftMembers.length ? (
                draftMembers.map((member) => (
                  <div
                    key={member.id}
                    className="grid grid-cols-1 items-center gap-2 rounded-[8px] border border-[#d7dfeb] bg-[#fcfdff] p-[14px] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)_180px_auto]"
                  >
                    <div className="text-sm font-semibold text-[#070c11]">{member.name}</div>
                    <div className="text-sm text-[#667085]">{member.email || "No email"}</div>
                    <div className="text-sm text-[#667085]">
                      {member.department || "No department"}
                    </div>
                    <div className="text-sm text-[#667085]">
                      {member.status === "ex" ? "Ex-Team Member" : "Current Team Member"}
                    </div>
                    <button
                      type="button"
                      className="rounded-[8px] border border-[#ffd5d2] bg-white px-4 py-2.5 text-sm font-semibold text-[#f04438] transition duration-200 hover:-translate-y-px"
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
            {canDeleteProject ? (
              <button
                type="button"
                className="mr-auto rounded-[8px] border border-[#ffd5d2] bg-white px-4 py-2.5 text-sm font-semibold text-[#f04438] transition duration-200 hover:-translate-y-px"
                onClick={() => setIsDeleteConfirmOpen(true)}
              >
                Delete Project
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-[8px] border border-[#c5d0de] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] transition duration-200 hover:-translate-y-px"
              onClick={() => navigate("/projects")}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-[8px] bg-[#17b26a] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(23,178,106,0.16)] transition duration-200 hover:-translate-y-px"
            >
              Save Changes
            </button>
          </div>
        </form>
      </section>

      {isDeleteConfirmOpen ? (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-[rgba(7,12,17,0.22)] px-4 py-6">
          <div className="w-full max-w-[520px] overflow-hidden rounded-[8px] bg-white shadow-[0_24px_64px_rgba(16,24,40,0.24)]">
            <div className="border-b border-[#d7dfeb] px-6 py-4">
              <h3 className="m-0 text-[18px] leading-[1.25] font-semibold text-[#070c11]">
                Delete Project
              </h3>
            </div>

            <div className="px-6 py-5 text-sm leading-6 text-[#667085]">
              Do you really want to delete this project from the tool? This will also
              remove its related timeline data.
            </div>

            <div className="flex justify-end gap-3 border-t border-[#d7dfeb] bg-[#fcfdff] px-6 py-4">
              <button
                type="button"
                className="rounded-[8px] border border-[#c5d0de] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] transition duration-200 hover:-translate-y-px"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-[8px] bg-[#f04438] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(240,68,56,0.18)] transition duration-200 hover:-translate-y-px"
                onClick={handleConfirmDelete}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ProjectEditPage;
