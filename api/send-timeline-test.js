import { Resend } from "resend";
import { createTimelineTaskEmail } from "../server/emailTemplates.js";
import { getAdminFirestore } from "../server/firebaseAdmin.js";
import {
  getIstDateString,
  getTimelineNotificationCandidates,
} from "../server/timelineNotifications.js";

function getBearerToken(request) {
  const authorization = String(request.headers.authorization || "");
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

async function verifyFirebaseUser(idToken) {
  const firebaseApiKey =
    process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;

  if (!firebaseApiKey) {
    throw new Error("Firebase API key is not configured on the server.");
  }

  const verificationResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!verificationResponse.ok) {
    return null;
  }

  const result = await verificationResponse.json();
  return result.users?.[0] || null;
}

function formatDueDate(dateString) {
  const [year, month, day] = String(dateString).split("-");
  return year && month && day ? `${day}-${month}-${year}` : dateString;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  try {
    const idToken = getBearerToken(request);
    if (!idToken || !(await verifyFirebaseUser(idToken))) {
      return response.status(401).json({ error: "Authentication required." });
    }

    const managerEmail = String(
      process.env.TIMELINE_NOTIFICATION_EMAIL || ""
    ).trim().toLowerCase();
    const portalUrl = String(process.env.PORTAL_URL || "").replace(/\/+$/, "");
    const projectId = String(request.body?.projectId || "").trim();

    if (
      !process.env.RESEND_API_KEY ||
      !process.env.RESEND_FROM_EMAIL ||
      !managerEmail.includes("@") ||
      !portalUrl
    ) {
      return response.status(503).json({
        error: "Timeline email environment variables are incomplete.",
      });
    }

    if (!projectId || projectId.includes("/")) {
      return response.status(400).json({ error: "A valid project is required." });
    }

    const projectSnapshot = await getAdminFirestore()
      .collection("projects")
      .doc(projectId)
      .get();

    if (!projectSnapshot.exists) {
      return response.status(404).json({ error: "Project not found." });
    }

    const project = { id: projectSnapshot.id, ...projectSnapshot.data() };
    const candidates = getTimelineNotificationCandidates(
      [project],
      getIstDateString(),
      managerEmail
    );
    let candidate =
      candidates.find((item) => item.type === "overdue") || candidates[0];

    if (!candidate) {
      const previewTasks = (project.timeline?.data || [])
        .filter(
          (task) =>
            !task.isPhase &&
            ["ongoing", "pending"].includes(String(task.status || "pending"))
        )
        .map((task) => ({
          id: task.id,
          name: task.text || "Untitled task",
          dueDate: task.end_date || "Not scheduled",
          status: task.status || "pending",
          daysOverdue: 0,
        }));

      if (!previewTasks.length) {
        return response.status(400).json({
          error: "This project has no pending or ongoing tasks to include in a test email.",
        });
      }

      candidate = { type: "due-soon", tasks: previewTasks };
    }

    const timelineUrl = `${portalUrl}/projects/${encodeURIComponent(project.id)}/timeline`;
    const message = createTimelineTaskEmail({
      type: candidate.type,
      projectName: project.name || "Project",
      tasks: candidate.tasks.map((task) => ({
        ...task,
        dueDate: formatDueDate(task.dueDate),
      })),
      timelineUrl,
      portalUrl,
    });
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: managerEmail,
      subject: `[TEST] ${message.subject}`,
      html: message.html,
      text: `TEST EMAIL\n\n${message.text}`,
    });

    if (error) {
      throw new Error(error.message || "Resend rejected the test email.");
    }

    return response.status(200).json({
      id: data?.id || "",
      recipient: managerEmail,
      taskCount: candidate.tasks.length,
      type: candidate.type,
    });
  } catch (error) {
    console.error("Timeline test email failed:", error);
    return response.status(500).json({
      error:
        error instanceof Error ? error.message : "Unable to send the test email.",
    });
  }
}
