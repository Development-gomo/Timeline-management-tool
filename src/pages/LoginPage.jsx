import { useState } from "react";
import logo from "../../images/Primary-logo.webp";

const inputClass =
  "form-field w-full rounded-[8px] border border-[#c5d0de] bg-white px-[14px] py-3 text-sm text-[#070c11] outline-none transition focus:border-[rgba(23,178,106,0.5)] focus:shadow-[0_0_0_4px_rgba(23,178,106,0.08)]";

function LoginPage({
  onLogin,
  authConfigReady,
  authInitError = "",
  authAccessError = "",
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (authInitError) {
      setError(authInitError);
      return;
    }

    if (!authConfigReady) {
      setError(
        "Firebase auth config is missing. Add the Firebase keys to .env.local and restart the app."
      );
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onLogin({
        email: email.trim(),
        password,
      });
    } catch (loginError) {
      setError(loginError.message || "Unable to sign in.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(23,178,106,0.12),_transparent_30%),linear-gradient(180deg,_#f8fbff_0%,_#f4f7fb_100%)] px-6 py-10">
      <div className="grid w-full max-w-[1040px] overflow-hidden rounded-[16px] border border-[#d7dfeb] bg-white shadow-[0_24px_64px_rgba(16,24,40,0.12)] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden bg-[linear-gradient(160deg,_#f4fff9_0%,_#eff7ff_100%)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <img className="max-w-[168px]" src={logo} alt="Gomo Group" />
            <p className="mt-8 mb-3 text-[0.78rem] font-extrabold uppercase tracking-[0.12em] text-[#17b26a]">
              Website Delivery Workspace
            </p>
            <h1 className="m-0 max-w-[420px] text-[32px] leading-[1.15] font-semibold text-[#070c11]">
              Manage projects, timelines, and delivery accountability in one place.
            </h1>
            <p className="mt-5 max-w-[460px] text-[15px] leading-7 text-[#667085]">
              Sign in to access the shared project dashboard, update team assignments,
              and keep every website delivery plan aligned.
            </p>
          </div>

          <div className="rounded-[12px] border border-[#d7dfeb] bg-white/80 p-5 backdrop-blur">
            <div className="mb-2 text-sm font-semibold text-[#070c11]">Protected workspace</div>
            <div className="text-sm leading-6 text-[#667085]">
              Only authenticated team members can view and edit this tool.
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-[420px]">
            <img className="mb-8 max-w-[152px] lg:hidden" src={logo} alt="Gomo Group" />
            <p className="mb-2 text-[0.78rem] font-extrabold uppercase tracking-[0.12em] text-[#17b26a]">
              Sign in
            </p>
            <h2 className="m-0 text-[20px] leading-[1.25] font-semibold text-[#070c11]">
              Access the project workspace
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#667085]">
              Use your Firebase-authenticated account to continue.
            </p>

            {authInitError ? (
              <div className="mt-4 rounded-[8px] border border-[#ffd5d2] bg-[#fff5f4] px-4 py-3 text-sm text-[#b42318]">
                {authInitError}
              </div>
            ) : null}
            {!authInitError && authAccessError ? (
              <div className="mt-4 rounded-[8px] border border-[#ffd5d2] bg-[#fff5f4] px-4 py-3 text-sm text-[#b42318]">
                {authAccessError}
              </div>
            ) : null}

            <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-semibold text-[#475467]">
                Email
                <input
                  className={inputClass}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  disabled={isSubmitting}
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-[#475467]">
                Password
                <input
                  className={inputClass}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                />
              </label>

              {error ? (
                <div className="rounded-[8px] border border-[#ffd5d2] bg-[#fff5f4] px-4 py-3 text-sm text-[#b42318]">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                className="mt-2 inline-flex items-center justify-center rounded-[8px] bg-[#17b26a] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(23,178,106,0.16)] transition duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Login"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
