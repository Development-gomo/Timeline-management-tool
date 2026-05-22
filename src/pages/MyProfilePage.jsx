import { useState } from "react";

const inputClass =
  "form-field w-full rounded-[8px] border border-[#c5d0de] bg-white px-[14px] py-3 text-sm text-[#070c11] outline-none transition focus:border-[rgba(23,178,106,0.5)] focus:shadow-[0_0_0_4px_rgba(23,178,106,0.08)]";

function MyProfilePage({ currentUserProfile, onUpdatePassword }) {
  const [newPassword, setNewPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const accountName = currentUserProfile?.name || "Current user";
  const accountEmail = currentUserProfile?.email || "";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatusMessage("");
    setErrorMessage("");

    if (newPassword.trim().length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsSaving(true);
    try {
      await onUpdatePassword(newPassword.trim());
      setNewPassword("");
      setStatusMessage("Password updated.");
    } catch (error) {
      setErrorMessage(
        error?.code === "auth/requires-recent-login"
          ? "Please log out, log back in, and try changing your password again."
          : error.message || "Unable to update password."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-6">
      <section className="rounded-[8px] border border-[#d7dfeb] bg-white p-6 shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
        <p className="mb-4 text-[13px] font-extrabold tracking-[0.2em] text-[#17b26a] uppercase">
          Account
        </p>
        <h2 className="m-0 text-[24px] leading-tight font-bold text-[#070c11]">
          {accountName}
        </h2>
        {accountEmail ? (
          <p className="mt-2 text-sm font-bold text-[#667085]">{accountEmail}</p>
        ) : null}
      </section>

      <section className="rounded-[8px] border border-[#d7dfeb] bg-white p-6 shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
        <div className="mb-6">
          <p className="mb-1 text-[13px] font-extrabold tracking-[0.2em] text-[#17b26a] uppercase">
            Security
          </p>
          <h2 className="m-0 text-[24px] leading-tight font-bold text-[#070c11]">
            Change password
          </h2>
        </div>

        <form className="grid gap-5" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-bold text-[#475467]">
            New password
            <input
              className={inputClass}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </label>

          {errorMessage ? (
            <div className="rounded-[8px] border border-[#ffd5d2] bg-[#fff5f4] px-4 py-3 text-sm text-[#b42318]">
              {errorMessage}
            </div>
          ) : null}

          {statusMessage ? (
            <div className="rounded-[8px] border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm text-[#027a48]">
              {statusMessage}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-[8px] bg-[#17b26a] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(23,178,106,0.16)] transition duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              disabled={isSaving || !newPassword.trim()}
            >
              {isSaving ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default MyProfilePage;
