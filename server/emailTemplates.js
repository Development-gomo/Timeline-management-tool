function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createUserWelcomeEmail({ name, email, password, portalUrl }) {
  const safeName = escapeHtml(name || "there");
  const safeEmail = escapeHtml(email);
  const safePassword = escapeHtml(password);
  const safePortalUrl = escapeHtml(portalUrl);

  return {
    subject: "Your GomoGroup project portal account",
    text: [
      `Hello ${name || "there"},`,
      "",
      "Your GomoGroup project portal account is ready.",
      "",
      `Portal: ${portalUrl}`,
      `Username: ${email}`,
      `Temporary password: ${password}`,
      "",
      "Please sign in and change your password from My Profile.",
      "",
      "GomoGroup",
    ].join("\n"),
    html: `
      <!doctype html>
      <html lang="en">
        <body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#101828">
          <div style="padding:32px 16px">
            <div style="max-width:560px;margin:0 auto;overflow:hidden;border:1px solid #d7dfeb;border-radius:12px;background:#ffffff">
              <div style="padding:24px 28px;border-bottom:1px solid #d7dfeb">
                <div style="font-size:22px;font-weight:700;color:#17b26a">GomoGroup</div>
              </div>
              <div style="padding:28px">
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.35">Your portal account is ready</h1>
                <p style="margin:0 0 20px;line-height:1.6;color:#475467">Hello ${safeName}, your account for the GomoGroup project portal has been created.</p>
                <div style="margin:0 0 24px;padding:18px;border-radius:8px;background:#f5f7fb">
                  <p style="margin:0 0 10px"><strong>Username:</strong> ${safeEmail}</p>
                  <p style="margin:0"><strong>Temporary password:</strong> ${safePassword}</p>
                </div>
                <a href="${safePortalUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#17b26a;color:#ffffff;font-weight:700;text-decoration:none">Open project portal</a>
                <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#667085">For security, please sign in and change your password from <strong>My Profile</strong>.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export { createUserWelcomeEmail };
