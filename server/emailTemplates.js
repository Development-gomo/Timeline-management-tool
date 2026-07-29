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
  const safeLogoUrl = `${safePortalUrl}/images/Primary-logo.webp`;

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
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Nunito+Sans:wght@400;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin:0;background:#f5f7fb;font-family:'Nunito Sans',Arial,sans-serif;color:#101828">
          <div style="padding:32px 16px">
            <div style="max-width:560px;margin:0 auto;overflow:hidden;border:1px solid #d7dfeb;border-radius:12px;background:#ffffff">
              <div style="padding:22px 28px;border-bottom:1px solid #d7dfeb">
                <img src="${safeLogoUrl}" width="155" alt="GomoGroup" style="display:block;width:155px;max-width:100%;height:auto;border:0">
              </div>
              <div style="padding:28px">
                <h1 style="margin:0 0 16px;font-family:Merriweather,Georgia,serif;font-size:22px;font-weight:700;line-height:1.35">Your portal account is ready</h1>
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

function createTimelineTaskEmail({
  type,
  projectName,
  taskName,
  dueDate,
  status,
  daysOverdue,
  timelineUrl,
  portalUrl,
}) {
  const isOverdue = type === "overdue";
  const safeProjectName = escapeHtml(projectName || "Project");
  const safeTaskName = escapeHtml(taskName || "Untitled task");
  const safeDueDate = escapeHtml(dueDate);
  const safeStatus = escapeHtml(status);
  const safeTimelineUrl = escapeHtml(timelineUrl);
  const safeLogoUrl = `${escapeHtml(portalUrl)}/images/Primary-logo.webp`;
  const heading = isOverdue
    ? `Task overdue by ${daysOverdue} day${daysOverdue === 1 ? "" : "s"}`
    : "Task due in 5 days";
  const intro = isOverdue
    ? "This task is past its due date and still requires attention."
    : "This task is approaching its due date.";

  return {
    subject: `${isOverdue ? "Overdue task" : "Task due soon"}: ${taskName} | ${projectName}`,
    text: [
      heading,
      "",
      intro,
      `Project: ${projectName}`,
      `Task: ${taskName}`,
      `Due date: ${dueDate}`,
      `Status: ${status}`,
      "",
      `Open timeline: ${timelineUrl}`,
    ].join("\n"),
    html: `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Nunito+Sans:wght@400;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin:0;background:#f5f7fb;font-family:'Nunito Sans',Arial,sans-serif;color:#101828">
          <div style="padding:32px 16px">
            <div style="max-width:560px;margin:0 auto;overflow:hidden;border:1px solid #d7dfeb;border-radius:12px;background:#ffffff">
              <div style="padding:22px 28px;border-bottom:1px solid #d7dfeb">
                <img src="${safeLogoUrl}" width="155" alt="GomoGroup" style="display:block;width:155px;max-width:100%;height:auto;border:0">
              </div>
              <div style="padding:28px">
                <div style="display:inline-block;margin-bottom:16px;padding:6px 10px;border-radius:999px;background:${isOverdue ? "#fff5f4" : "#fffaeb"};color:${isOverdue ? "#b42318" : "#b54708"};font-size:12px;font-weight:700">${isOverdue ? "OVERDUE" : "DUE SOON"}</div>
                <h1 style="margin:0 0 12px;font-family:Merriweather,Georgia,serif;font-size:22px;font-weight:700;line-height:1.35">${heading}</h1>
                <p style="margin:0 0 20px;line-height:1.6;color:#475467">${intro}</p>
                <div style="margin:0 0 24px;padding:18px;border-radius:8px;background:#f5f7fb">
                  <p style="margin:0 0 10px"><strong>Project:</strong> ${safeProjectName}</p>
                  <p style="margin:0 0 10px"><strong>Task:</strong> ${safeTaskName}</p>
                  <p style="margin:0 0 10px"><strong>Due date:</strong> ${safeDueDate}</p>
                  <p style="margin:0"><strong>Status:</strong> ${safeStatus}</p>
                </div>
                <a href="${safeTimelineUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#17b26a;color:#ffffff;font-weight:700;text-decoration:none">Open project timeline</a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export { createTimelineTaskEmail, createUserWelcomeEmail };
