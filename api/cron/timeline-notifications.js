import { Resend } from "resend";
import { createTimelineTaskEmail } from "../../server/emailTemplates.js";
import { getAdminFirestore } from "../../server/firebaseAdmin.js";
import {
  getIstDateString,
  getTimelineNotificationCandidates,
} from "../../server/timelineNotifications.js";

function sanitizeDocumentId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);
}

function formatDueDate(dateString) {
  const [year, month, day] = String(dateString).split("-");
  return year && month && day ? `${day}-${month}-${year}` : dateString;
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }

  if (!process.env.CRON_SECRET) {
    return response.status(503).json({ error: "CRON_SECRET is not configured." });
  }

  if (request.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return response.status(401).json({ error: "Unauthorized." });
  }

  const managerEmail = String(
    process.env.TIMELINE_NOTIFICATION_EMAIL || ""
  ).trim().toLowerCase();
  const portalUrl = String(process.env.PORTAL_URL || "").replace(/\/+$/, "");

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

  try {
    const firestore = getAdminFirestore();
    const projectSnapshot = await firestore.collection("projects").get();
    const projects = projectSnapshot.docs
      .filter((snapshot) => snapshot.id !== "_collection_meta")
      .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
    const today = getIstDateString();
    const candidates = getTimelineNotificationCandidates(
      projects,
      today,
      managerEmail
    );
    const resend = new Resend(process.env.RESEND_API_KEY);
    const results = [];

    for (const candidate of candidates) {
      const deliveryId = sanitizeDocumentId(
        `${today}_${candidate.type}_${candidate.project.id}`
      );
      const deliveryRef = firestore
        .collection("timeline_notification_deliveries")
        .doc(deliveryId);

      try {
        await deliveryRef.create({
          type: candidate.type,
          project_id: String(candidate.project.id),
          task_ids: candidate.tasks.map((task) => String(task.id)),
          notification_date: today,
          status: "sending",
          created_at: new Date().toISOString(),
        });
      } catch (error) {
        if (error?.code === 6 || error?.code === "already-exists") {
          results.push({ deliveryId, status: "skipped-duplicate" });
          continue;
        }
        throw error;
      }

      const timelineUrl = `${portalUrl}/projects/${encodeURIComponent(candidate.project.id)}/timeline`;
      const message = createTimelineTaskEmail({
        type: candidate.type,
        projectName: candidate.project.name || "Project",
        tasks: candidate.tasks.map((task) => ({
          ...task,
          dueDate: formatDueDate(task.dueDate),
        })),
        timelineUrl,
        portalUrl,
      });

      try {
        const { data, error } = await resend.emails.send(
          {
            from: process.env.RESEND_FROM_EMAIL,
            to: candidate.recipients,
            subject: message.subject,
            html: message.html,
            text: message.text,
          },
          { idempotencyKey: deliveryId }
        );

        if (error) {
          throw new Error(error.message || "Resend rejected the email.");
        }

        await deliveryRef.set(
          {
            status: "sent",
            recipients: candidate.recipients,
            resend_email_id: data?.id || "",
            sent_at: new Date().toISOString(),
          },
          { merge: true }
        );
        results.push({ deliveryId, status: "sent" });
      } catch (error) {
        await deliveryRef.delete().catch(() => {});
        results.push({
          deliveryId,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown email error",
        });
      }
    }

    const failed = results.filter((result) => result.status === "failed");
    return response.status(failed.length ? 500 : 200).json({
      date: today,
      candidates: candidates.length,
      sent: results.filter((result) => result.status === "sent").length,
      skipped: results.filter((result) => result.status === "skipped-duplicate").length,
      failed: failed.length,
      results,
    });
  } catch (error) {
    console.error("Timeline notification cron failed:", error);
    return response.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to process timeline notifications.",
    });
  }
}
