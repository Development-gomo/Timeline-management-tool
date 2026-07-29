import { Resend } from "resend";
import { createUserWelcomeEmail } from "../server/emailTemplates.js";

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

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  return result.users?.[0] || null;
}

function getPortalUrl(request) {
  if (process.env.PORTAL_URL) {
    return process.env.PORTAL_URL.replace(/\/+$/, "");
  }

  const forwardedProtocol = request.headers["x-forwarded-proto"];
  const protocol = Array.isArray(forwardedProtocol)
    ? forwardedProtocol[0]
    : forwardedProtocol || "https";
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  return `${protocol}://${host}`;
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

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return response.status(503).json({
        error: "Email delivery is not configured on the server.",
      });
    }

    const { name, email, password } = request.body || {};
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPassword = String(password || "");

    if (
      !normalizedEmail ||
      !normalizedEmail.includes("@") ||
      !normalizedPassword ||
      normalizedPassword.length > 256
    ) {
      return response.status(400).json({ error: "Invalid welcome email details." });
    }

    const portalUrl = getPortalUrl(request);
    const message = createUserWelcomeEmail({
      name: String(name || "").trim(),
      email: normalizedEmail,
      password: normalizedPassword,
      portalUrl,
    });
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: normalizedEmail,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (error) {
      console.error("Resend welcome email failed:", error);
      return response.status(502).json({
        error: error.message || "Resend could not deliver the welcome email.",
      });
    }

    return response.status(200).json({ id: data?.id || "" });
  } catch (error) {
    console.error("Welcome email endpoint failed:", error);
    return response.status(500).json({
      error: error instanceof Error ? error.message : "Unable to send welcome email.",
    });
  }
}
