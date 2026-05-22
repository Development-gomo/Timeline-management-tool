import { useEffect, useMemo, useState } from "react";

const inputClass =
  "form-field w-full rounded-[8px] border border-[#c5d0de] bg-white px-[14px] py-3 text-sm text-[#070c11] outline-none transition focus:border-[rgba(23,178,106,0.5)] focus:shadow-[0_0_0_4px_rgba(23,178,106,0.08)]";
const departmentOptions = ["Design", "Development", "CSM", "Content", "SEO", "SEA"];
const compareMembersByName = (firstMember, secondMember) =>
  String(firstMember.name || firstMember.email || "").localeCompare(
    String(secondMember.name || secondMember.email || ""),
    undefined,
    { sensitivity: "base" }
  );

function TeamMembersPage({
  teamMembers,
  onAddTeamMember,
  onUpdateTeamMember,
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeMemberTab, setActiveMemberTab] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [editingMemberId, setEditingMemberId] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    department: "",
    status: "current",
  });
  const [memberForm, setMemberForm] = useState({
    name: "",
    email: "",
    department: "",
    status: "current",
  });

  const currentMembers = teamMembers.filter((member) => member.status !== "ex");
  const exMembers = teamMembers.filter((member) => member.status === "ex");
  const filteredMembers = useMemo(() => {
    const tabMembers =
      activeMemberTab === "current"
        ? currentMembers
        : activeMemberTab === "ex"
          ? exMembers
          : teamMembers;

    const departmentMembers =
      selectedDepartment === "all"
        ? tabMembers
        : tabMembers.filter((member) => member.department === selectedDepartment);

    return [...departmentMembers].sort(compareMembersByName);
  }, [activeMemberTab, currentMembers, exMembers, selectedDepartment, teamMembers]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const didAdd = onAddTeamMember(memberForm);
    if (!didAdd) {
      return;
    }

    setMemberForm({
      name: "",
      email: "",
      department: "",
      status: "current",
    });
    setIsAddModalOpen(false);
  };

  useEffect(() => {
    if (!isAddModalOpen) {
      return undefined;
    }

    const handleEscapeClose = (event) => {
      if (event.key === "Escape") {
        setIsAddModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscapeClose);
    return () => document.removeEventListener("keydown", handleEscapeClose);
  }, [isAddModalOpen]);

  useEffect(() => {
    const openAddMemberModal = () => setIsAddModalOpen(true);
    window.addEventListener("open-add-team-member-modal", openAddMemberModal);
    return () =>
      window.removeEventListener("open-add-team-member-modal", openAddMemberModal);
  }, []);

  const startEditingMember = (member) => {
    setEditingMemberId(member.id);
    setEditForm({
      name: member.name || "",
      email: member.email || "",
      department: member.department || "",
      status: member.status || "current",
    });
  };

  const cancelEditingMember = () => {
    setEditingMemberId("");
    setEditForm({
      name: "",
      email: "",
      department: "",
      status: "current",
    });
  };

  const saveEditingMember = (member) => {
    onUpdateTeamMember(member.id, {
      ...member,
      name: editForm.name,
      email: editForm.email,
      department: editForm.department,
      status: editForm.status,
    });
    cancelEditingMember();
  };

  return (
    <div>
      <section className="overflow-hidden rounded-[8px] border border-[#d7dfeb] bg-white shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d7dfeb] bg-white px-5 py-4">
          <div
            className="inline-flex flex-wrap items-center gap-1 rounded-[8px] border border-[#d7dfeb] bg-white p-[5px]"
            aria-label="Team member summary filters"
          >
            {[
              { id: "all", label: "Total Members", value: teamMembers.length },
              { id: "current", label: "Current Team", value: currentMembers.length },
              { id: "ex", label: "Ex-Team Members", value: exMembers.length },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={
                  activeMemberTab === tab.id
                    ? "rounded-[8px] bg-[#e8f8ef] px-3.5 py-2 text-sm font-bold text-[#17b26a] transition duration-200 hover:-translate-y-px"
                    : "rounded-[8px] bg-transparent px-3.5 py-2 text-sm font-bold text-[#475467] transition duration-200 hover:-translate-y-px"
                }
                onClick={() => setActiveMemberTab(tab.id)}
              >
                {tab.label} ({tab.value})
              </button>
            ))}
          </div>

          <select
            className={`app-select ${inputClass} min-w-[180px] max-w-[240px]`}
            value={selectedDepartment}
            onChange={(event) => setSelectedDepartment(event.target.value)}
          >
            <option value="all">All departments</option>
            {departmentOptions.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden grid-cols-[1.2fr_1.8fr_1fr_1fr_120px] gap-4 border-b border-[#d7dfeb] bg-[#f5f7fb] px-5 py-4 text-xs font-extrabold tracking-[0.04em] text-[#667085] uppercase xl:grid">
          <span>Name</span>
          <span>Email</span>
          <span>Department</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        <div className="divide-y divide-[#d7dfeb]">
          {filteredMembers.length ? (
            filteredMembers.map((member) => {
              const isEditing = editingMemberId === member.id;

              return (
                <article
                  key={member.id}
                  className="grid gap-3 px-5 py-4 text-sm text-[#070c11] xl:grid-cols-[1.2fr_1.8fr_1fr_1fr_120px] xl:items-center"
                >
                  <div>
                    <span className="mb-1 block text-[11px] font-extrabold tracking-[0.04em] text-[#667085] uppercase xl:hidden">
                      Name
                    </span>
                    {isEditing ? (
                      <input
                        className={inputClass}
                        value={editForm.name}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                      />
                    ) : (
                      <span className="font-bold">{member.name}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="mb-1 block text-[11px] font-extrabold tracking-[0.04em] text-[#667085] uppercase xl:hidden">
                      Email
                    </span>
                    {isEditing ? (
                      <input
                        className={inputClass}
                        value={editForm.email}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                      />
                    ) : (
                      <span className="block truncate text-[#667085]">
                        {member.email || "No email"}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="mb-1 block text-[11px] font-extrabold tracking-[0.04em] text-[#667085] uppercase xl:hidden">
                      Department
                    </span>
                    {isEditing ? (
                      <select
                        className={`app-select ${inputClass}`}
                        value={editForm.department}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            department: event.target.value,
                          }))
                        }
                      >
                        <option value="">Select department</option>
                        {departmentOptions.map((department) => (
                          <option key={department} value={department}>
                            {department}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span>{member.department || "No department"}</span>
                    )}
                  </div>

                  <div>
                    <span className="mb-1 block text-[11px] font-extrabold tracking-[0.04em] text-[#667085] uppercase xl:hidden">
                      Status
                    </span>
                    {isEditing ? (
                      <select
                        className={`app-select ${inputClass}`}
                        value={editForm.status}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            status: event.target.value,
                          }))
                        }
                      >
                        <option value="current">Current Team Member</option>
                        <option value="ex">Ex-Team Member</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${
                          member.status === "ex"
                            ? "bg-[#fff7ed] text-[#c2410c]"
                            : "bg-[#ecfdf3] text-[#039855]"
                        }`}
                      >
                        {member.status === "ex" ? "ex-team" : "current"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="rounded-[8px] bg-[#17b26a] px-3 py-2 text-xs font-bold text-white transition duration-200 hover:-translate-y-px"
                          onClick={() => saveEditingMember(member)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="rounded-[8px] border border-[#c5d0de] bg-white px-3 py-2 text-xs font-bold text-[#344054] transition duration-200 hover:-translate-y-px"
                          onClick={cancelEditingMember}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#c5d0de] bg-white text-[#475467] transition duration-200 hover:-translate-y-px"
                        onClick={() => startEditingMember(member)}
                        aria-label={`Edit ${member.name}`}
                        title="Edit member"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                          <path d="m14.4 5.6 4 4M4.8 19.2l4.95-1 8.76-8.76a2.83 2.83 0 0 0-4-4L5.75 14.2l-.95 5Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="p-5 text-sm text-[#667085]">
              {teamMembers.length
                ? "No team members match the selected filters."
                : "No team members added yet. Start by creating your shared directory here."}
            </div>
          )}
        </div>
      </section>

      {isAddModalOpen ? (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-[rgba(7,12,17,0.22)] px-4 py-6">
          <div className="w-full max-w-[560px] overflow-hidden rounded-[8px] bg-white shadow-[0_24px_64px_rgba(16,24,40,0.24)]">
            <div className="border-b border-[#d7dfeb] px-6 py-4">
              <h3 className="m-0 text-[18px] leading-[1.25] font-bold text-[#070c11]">
                Add Team Member
              </h3>
            </div>

            <form className="grid gap-3 px-6 py-5" onSubmit={handleSubmit}>
              <input
                className={inputClass}
                value={memberForm.name}
                onChange={(event) =>
                  setMemberForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Full name"
              />
              <input
                className={inputClass}
                value={memberForm.email}
                onChange={(event) =>
                  setMemberForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="Email address"
              />
              <select
                className={`app-select ${inputClass}`}
                value={memberForm.department}
                onChange={(event) =>
                  setMemberForm((current) => ({
                    ...current,
                    department: event.target.value,
                  }))
                }
              >
                <option value="">Select department</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
              <select
                className={`app-select ${inputClass}`}
                value={memberForm.status}
                onChange={(event) =>
                  setMemberForm((current) => ({ ...current, status: event.target.value }))
                }
              >
                <option value="current">Current Team Member</option>
                <option value="ex">Ex-Team Member</option>
              </select>

              <div className="mt-2 flex justify-end gap-3 border-t border-[#d7dfeb] pt-4">
                <button
                  type="button"
                  className="rounded-[8px] border border-[#c5d0de] bg-white px-4 py-2.5 text-sm font-bold text-[#344054] transition duration-200 hover:-translate-y-px"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-[8px] bg-[#17b26a] px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_20px_rgba(23,178,106,0.16)] transition duration-200 hover:-translate-y-px"
                >
                  Add Team Member
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default TeamMembersPage;
