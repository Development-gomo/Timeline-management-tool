import { firebaseAuth } from "./firebase";

async function sendNewUserWelcomeEmail({ name, email, password }) {
  const currentUser = firebaseAuth?.currentUser;

  if (!currentUser) {
    throw new Error("You must be signed in to send a welcome email.");
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch("/api/send-user-welcome", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email, password }),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Unable to send the welcome email.");
  }

  return result;
}

async function sendTimelineTestEmail(projectId) {
  const currentUser = firebaseAuth?.currentUser;

  if (!currentUser) {
    throw new Error("You must be signed in to send a test email.");
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch("/api/send-timeline-test", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ projectId }),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Unable to send the timeline test email.");
  }

  return result;
}

export { sendNewUserWelcomeEmail, sendTimelineTestEmail };
