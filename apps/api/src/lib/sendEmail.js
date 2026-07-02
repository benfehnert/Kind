function readEnv(env, key, fallback = "") {
  return env?.[key] ?? process.env[key] ?? fallback;
}

export async function sendEmail({ to, subject, text }, env = {}) {
  const apiKey = readEnv(env, "RESEND_API_KEY");
  const from = readEnv(env, "RESEND_FROM_EMAIL", "Kind <notifications@kind-health.app>");

  if (!apiKey) {
    console.log("[sendEmail] RESEND_API_KEY not set — logging email instead:");
    console.log(`  From: ${from}`);
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:\n${text}`);
    return { id: "dev-logged", dev: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Resend error (${res.status})`);
  }

  return data;
}
