import { useEffect, useMemo, useState } from "react";

const inputClass =
  "form-field w-full rounded-[8px] border border-[#c5d0de] bg-white px-[14px] py-3 text-sm text-[#070c11] outline-none transition focus:border-[rgba(23,178,106,0.5)] focus:shadow-[0_0_0_4px_rgba(23,178,106,0.08)]";
const compareUsersByName = (firstUser, secondUser) =>
  String(firstUser.name || firstUser.email || "").localeCompare(
    String(secondUser.name || secondUser.email || ""),
    undefined,
    { sensitivity: "base" }
  );

function formatRoleLabel(role) {
  if (role === "super_admin") {
    return "Super admin";
  }

  if (role === "admin") {
    return "Admin";
  }

  return "User";
}

function UserManagementPage({
  appUsers,
  currentUserEmail,
  currentUserRole = "user",
  isSuperAdmin,
  onAddAppUser,
  onSendPasswordReset,
  onUpdateAppUser,
  onDeleteAppUser,
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeUserTab, setActiveUserTab] = useState("all");
  const [formError, setFormError] = useState("");
  const [pageNotice, setPageNotice] = useState("");
  const [pageNoticeTone, setPageNoticeTone] = useState("success");
  const [sendingResetUserId, setSendingResetUserId] = useState("");
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    status: "active",
  });
  const [editingUserId, setEditingUserId] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    role: "user",
    status: "active",
  });

  const activeUsers = appUsers.filter((user) => user.status !== "disabled");
  const superAdmins = appUsers.filter((user) => user.role === "super_admin");
  const visibleUsers = useMemo(() => {
    if (activeUserTab === "active") {
      return [...activeUsers].sort(compareUsersByName);
    }

    if (activeUserTab === "super_admins") {
      return [...superAdmins].sort(compareUsersByName);
    }

    return [...appUsers].sort(compareUsersByName);
  }, [activeUserTab, activeUsers, appUsers, superAdmins]);
  const canCreateUsers = true;
  const roleOptions = useMemo(() => {
    if (currentUserRole === "super_admin") {
      return [
        { value: "user", label: "User" },
        { value: "admin", label: "Admin" },
        { value: "super_admin", label: "Super admin" },
      ];
    }

    if (currentUserRole === "admin") {
      return [
        { value: "user", label: "User" },
        { value: "admin", label: "Admin" },
      ];
    }

    return [{ value: "user", label: "User" }];
  }, [currentUserRole]);

  useEffect(() => {
    const openAddUserModal = () => {
      if (canCreateUsers) {
        setFormError("");
        setIsAddModalOpen(true);
      }
    };

    window.addEventListener("open-add-user-modal", openAddUserModal);
    return () => window.removeEventListener("open-add-user-modal", openAddUserModal);
  }, [canCreateUsers]);

  useEffect(() => {
    if (!isAddModalOpen) {
      return undefined;
    }

    const handleEscapeClose = (event) => {
      if (event.key === "Escape") {
        setFormError("");
        setIsAddModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscapeClose);
    return () => document.removeEventListener("keydown", handleEscapeClose);
  }, [isAddModalOpen]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!canCreateUsers) {
      setFormError("You do not have access to add users.");
      return;
    }

    let addResult = false;
    try {
      addResult = await onAddAppUser(userForm);
    } catch (error) {
      setFormError(error.message || "Unable to add this app user.");
      return;
    }

    if (!addResult || addResult.success === false) {
      setFormError("Unable to add this app user.");
      return;
    }

    setPageNotice(
      addResult.notice ||
        (addResult.emailSent ? "User created and welcome email sent successfully." : "")
    );
    setPageNoticeTone(addResult.notice && !addResult.emailSent ? "warning" : "success");
    setUserForm({
      name: "",
      email: "",
      password: "",
      role: "user",
      status: "active",
    });
    setIsAddModalOpen(false);
  };

  const canManageTarget = (user) => {
    if (currentUserRole === "super_admin") {
      return true;
    }

    if (currentUserRole === "admin") {
      return user.role === "user";
    }

    return false;
  };

  const canDeleteTarget = (user) => {
    const isCurrentUser =
      String(user.email || "").toLowerCase() === String(currentUserEmail || "").toLowerCase();
    return !isCurrentUser && canManageTarget(user);
  };

  const startEditingUser = (user) => {
    setEditingUserId(user.id);
    setEditForm({
      name: user.name || "",
      role: user.role || "user",
      status: user.status || "active",
    });
  };

  const cancelEditingUser = () => {
    setEditingUserId("");
    setEditForm({
      name: "",
      role: "user",
      status: "active",
    });
  };

  const saveEditingUser = (user) => {
    onUpdateAppUser(user.id, {
      ...user,
      name: editForm.name,
      role: editForm.role,
      status: editForm.status,
    });
    cancelEditingUser();
  };

  const handleDeleteUser = (user) => {
    const didConfirm = window.confirm(
      `Delete ${user.name || user.email}? This removes their app profile.`
    );

    if (didConfirm) {
      onDeleteAppUser(user.id);
    }
  };

  const handleSendPasswordReset = async (user) => {
    setSendingResetUserId(user.id);
    setPageNotice("");

    try {
      await onSendPasswordReset(user);
      setPageNotice(`Password reset email sent to ${user.email}.`);
      setPageNoticeTone("success");
    } catch (error) {
      setPageNotice(
        `Could not send a password reset email to ${user.email}: ${
          error.message || "Unknown error."
        }`
      );
      setPageNoticeTone("warning");
    } finally {
      setSendingResetUserId("");
    }
  };

  return (
    <div>
      {pageNotice ? (
        <div
          className={[
            "mb-4 flex items-start justify-between gap-4 rounded-[8px] border px-4 py-3 text-sm font-bold",
            pageNoticeTone === "warning"
              ? "border-[#fedf89] bg-[#fffaeb] text-[#b54708]"
              : "border-[#abefc6] bg-[#ecfdf3] text-[#067647]",
          ].join(" ")}
          role="status"
        >
          <span>{pageNotice}</span>
          <button
            type="button"
            className="shrink-0 text-current"
            onClick={() => setPageNotice("")}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ) : null}
      <section className="overflow-hidden rounded-[8px] border border-[#d7dfeb] bg-white shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
        <div className="border-b border-[#d7dfeb] bg-white px-5 py-4">
          <div
            className="inline-flex flex-wrap items-center gap-1 rounded-[8px] border border-[#d7dfeb] bg-white p-[5px]"
            aria-label="User summary filters"
          >
            {[
              { id: "all", label: "Total App Users", value: appUsers.length },
              { id: "active", label: "Active Access", value: activeUsers.length },
              { id: "super_admins", label: "Super Admins", value: superAdmins.length },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={
                  activeUserTab === tab.id
                    ? "rounded-[8px] bg-[#e8f8ef] px-3.5 py-2 text-sm font-bold text-[#17b26a] transition duration-200 hover:-translate-y-px"
                    : "rounded-[8px] bg-transparent px-3.5 py-2 text-sm font-bold text-[#475467] transition duration-200 hover:-translate-y-px"
                }
                onClick={() => setActiveUserTab(tab.id)}
              >
                {tab.label} ({tab.value})
              </button>
            ))}
          </div>
        </div>

        <div className="hidden grid-cols-[1.2fr_1.9fr_1fr_1fr_150px] gap-4 border-b border-[#d7dfeb] bg-[#f5f7fb] px-5 py-4 text-xs font-extrabold tracking-[0.04em] text-[#667085] uppercase xl:grid">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        <div className="divide-y divide-[#d7dfeb]">
          {visibleUsers.length ? (
            visibleUsers.map((user) => {
              const isCurrentUser =
                String(user.email || "").toLowerCase() === currentUserEmail;
              const canEditTarget = canManageTarget(user);
              const canRemoveTarget = canDeleteTarget(user);
              const isEditing = editingUserId === user.id;

              return (
                <article
                  key={user.id}
                  className="grid gap-3 px-5 py-4 text-sm text-[#070c11] xl:grid-cols-[1.2fr_1.9fr_1fr_1fr_150px] xl:items-center"
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
                      <span className="font-bold">{user.name}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="mb-1 block text-[11px] font-extrabold tracking-[0.04em] text-[#667085] uppercase xl:hidden">
                      Email
                    </span>
                    <span className="block truncate text-[#667085]">{user.email}</span>
                  </div>

                  <div>
                    <span className="mb-1 block text-[11px] font-extrabold tracking-[0.04em] text-[#667085] uppercase xl:hidden">
                      Role
                    </span>
                    {isEditing && (isSuperAdmin || currentUserRole === "admin") ? (
                      <select
                        className={`app-select ${inputClass}`}
                        value={editForm.role}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            role: event.target.value,
                          }))
                        }
                        disabled={!canEditTarget}
                      >
                        {roleOptions.map((roleOption) => (
                          <option key={roleOption.value} value={roleOption.value}>
                            {roleOption.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span>{formatRoleLabel(user.role)}</span>
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
                        disabled={!canEditTarget}
                      >
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${
                          user.status === "disabled"
                            ? "bg-[#fff5f4] text-[#b42318]"
                            : "bg-[#ecfdf3] text-[#039855]"
                        }`}
                      >
                        {user.status === "disabled" ? "disabled" : "active"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="rounded-[8px] bg-[#17b26a] px-3 py-2 text-xs font-bold text-white transition duration-200 hover:-translate-y-px"
                          onClick={() => saveEditingUser(user)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="rounded-[8px] border border-[#c5d0de] bg-white px-3 py-2 text-xs font-bold text-[#344054] transition duration-200 hover:-translate-y-px"
                          onClick={cancelEditingUser}
                        >
                          Cancel
                        </button>
                      </>
                    ) : canEditTarget || canRemoveTarget || isCurrentUser ? (
                      <>
                        {canEditTarget ? (
                          <button
                            type="button"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#abefc6] bg-white text-[#039855] transition duration-200 hover:-translate-y-px disabled:cursor-wait disabled:opacity-50"
                            onClick={() => handleSendPasswordReset(user)}
                            disabled={sendingResetUserId === user.id}
                            aria-label={`Send password reset email to ${user.name}`}
                            title="Send password reset email"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                              <path d="M4 6.5h16v11H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                              <path d="m4.8 7.3 7.2 5.5 7.2-5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M17.5 3.5v4M15.5 5.5h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                          </button>
                        ) : null}
                        {canEditTarget ? (
                          <button
                            type="button"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#c5d0de] bg-white text-[#475467] transition duration-200 hover:-translate-y-px"
                            onClick={() => startEditingUser(user)}
                            aria-label={`Edit ${user.name}`}
                            title="Edit user"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                              <path d="m14.4 5.6 4 4M4.8 19.2l4.95-1 8.76-8.76a2.83 2.83 0 0 0-4-4L5.75 14.2l-.95 5Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        ) : null}
                        {canRemoveTarget ? (
                          <button
                            type="button"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#ffd5d2] bg-white text-[#f04438] transition duration-200 hover:-translate-y-px"
                            onClick={() => handleDeleteUser(user)}
                            aria-label={`Delete ${user.name}`}
                            title="Delete user"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                              <path d="M4 7h16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                              <path d="M9 7V5.8C9 4.81 9.81 4 10.8 4h2.4C14.19 4 15 4.81 15 5.8V7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                              <path d="M7 7l.8 11.2A2 2 0 0 0 9.79 20h4.42a2 2 0 0 0 1.99-1.8L17 7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M10 11v5M14 11v5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                            </svg>
                          </button>
                        ) : isCurrentUser ? (
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#f2f4f7] px-2 py-2 text-xs font-bold text-[#475467]">
                            You
                          </span>
                        ) : null}
                      </>
                    ) : currentUserRole !== "user" ? (
                      <span className="rounded-[8px] bg-[#fdf2f2] px-3 py-2 text-xs font-bold text-[#b42318]">
                        No access
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="p-5 text-sm text-[#667085]">
              No users found for this view.
            </div>
          )}
        </div>
      </section>

      {isAddModalOpen ? (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-[rgba(7,12,17,0.22)] px-4 py-6">
          <div className="w-full max-w-[560px] overflow-hidden rounded-[8px] bg-white shadow-[0_24px_64px_rgba(16,24,40,0.24)]">
            <div className="border-b border-[#d7dfeb] px-6 py-4">
              <h3 className="m-0 text-[18px] leading-[1.25] font-bold text-[#070c11]">
                Add new user
              </h3>
            </div>

            <form className="grid gap-3 px-6 py-5" onSubmit={handleSubmit}>
              <input
                className={inputClass}
                value={userForm.name}
                onChange={(event) =>
                  setUserForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Name"
              />
              <input
                className={inputClass}
                value={userForm.email}
                onChange={(event) =>
                  setUserForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="Email"
                type="email"
              />
              <input
                className={inputClass}
                value={userForm.password}
                onChange={(event) =>
                  setUserForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="Password"
                type="password"
                autoComplete="new-password"
              />
              <select
                className={`app-select ${inputClass}`}
                value={userForm.role}
                onChange={(event) =>
                  setUserForm((current) => ({ ...current, role: event.target.value }))
                }
              >
                {roleOptions.map((roleOption) => (
                  <option key={roleOption.value} value={roleOption.value}>
                    {roleOption.label}
                  </option>
                ))}
              </select>
              <select
                className={`app-select ${inputClass}`}
                value={userForm.status}
                onChange={(event) =>
                  setUserForm((current) => ({ ...current, status: event.target.value }))
                }
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>

              {formError ? (
                <div className="rounded-[8px] border border-[#ffd5d2] bg-[#fff5f4] px-4 py-3 text-sm text-[#b42318]">
                  {formError}
                </div>
              ) : null}

              <div className="mt-2 flex justify-end gap-3 border-t border-[#d7dfeb] pt-4">
                <button
                  type="button"
                  className="rounded-[8px] border border-[#c5d0de] bg-white px-4 py-2.5 text-sm font-bold text-[#344054] transition duration-200 hover:-translate-y-px"
                  onClick={() => {
                    setFormError("");
                    setIsAddModalOpen(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-[8px] bg-[#17b26a] px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_20px_rgba(23,178,106,0.16)] transition duration-200 hover:-translate-y-px"
                >
                  Create user
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default UserManagementPage;
