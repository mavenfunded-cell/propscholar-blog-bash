import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IMAP_HOST = "imap.hostinger.com";
const IMAP_PORT = 993;
const BUSINESS_EMAIL = "business@propscholar.com";

async function sendCommand(conn: Deno.TlsConn, tag: string, command: string): Promise<string> {
  const encoder = new TextEncoder();
  const fullCommand = `${tag} ${command}\r\n`;
  await conn.write(encoder.encode(fullCommand));
  
  const decoder = new TextDecoder();
  const buffer = new Uint8Array(65536);
  let response = "";
  const startTime = Date.now();
  const timeout = 30000;
  
  while (true) {
    if (Date.now() - startTime > timeout) throw new Error(`IMAP timeout: ${tag}`);
    const n = await conn.read(buffer);
    if (n === null) break;
    response += decoder.decode(buffer.subarray(0, n));
    if (response.includes(`${tag} OK`) || response.includes(`${tag} NO`) || response.includes(`${tag} BAD`)) break;
  }
  return response;
}

async function readResponse(conn: Deno.TlsConn): Promise<string> {
  const decoder = new TextDecoder();
  const buffer = new Uint8Array(8192);
  const n = await conn.read(buffer);
  if (n === null) return "";
  return decoder.decode(buffer.subarray(0, n));
}

function parseEmailHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const headerSection = raw.split("\r\n\r\n")[0] || raw.split("\n\n")[0];
  let currentHeader = "";
  let currentValue = "";
  for (const line of headerSection.split(/\r?\n/)) {
    if (line.match(/^[A-Za-z-]+:/)) {
      if (currentHeader) headers[currentHeader.toLowerCase()] = currentValue.trim();
      const colonIndex = line.indexOf(":");
      currentHeader = line.substring(0, colonIndex);
      currentValue = line.substring(colonIndex + 1);
    } else if (line.match(/^\s/) && currentHeader) {
      currentValue += " " + line.trim();
    }
  }
  if (currentHeader) headers[currentHeader.toLowerCase()] = currentValue.trim();
  return headers;
}

function extractEmail(emailString: string): string {
  if (!emailString) return "";
  const match = emailString.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase().trim() : emailString.trim().toLowerCase();
}

function extractName(emailString: string): string {
  if (!emailString) return "";
  const match = emailString.match(/^"?([^"<]+)"?\s*</);
  if (match) return match[1].trim();
  return emailString.split("@")[0];
}

function decodeQuotedPrintable(content: string): string {
  return content
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractBody(raw: string): { text: string; html: string | null } {
  const parts = raw.split(/\r?\n\r?\n/);
  if (parts.length < 2) return { text: "", html: null };
  const body = parts.slice(1).join("\n\n");
  const headers = parseEmailHeaders(raw);
  const contentType = headers["content-type"] || "";
  const encoding = headers["content-transfer-encoding"] || "";

  if (contentType.includes("multipart")) {
    const boundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/i);
    if (boundaryMatch) {
      const boundary = boundaryMatch[1];
      const sections = body.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      let textBody = "";
      let htmlBody: string | null = null;

      for (const section of sections) {
        if (!section.trim() || section.trim() === "--") continue;
        const sHeaders = parseEmailHeaders(section);
        const sCT = (sHeaders["content-type"] || "").toLowerCase();
        const sEnc = (sHeaders["content-transfer-encoding"] || "").toLowerCase();
        
        // Handle nested multipart
        if (sCT.includes("multipart")) {
          const nestedBM = sCT.match(/boundary="?([^";\s]+)"?/i);
          if (nestedBM) {
            const nestedParts = section.split(/\r?\n\r?\n/).slice(1).join("\n\n");
            const nestedSections = nestedParts.split(new RegExp(`--${nestedBM[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
            for (const ns of nestedSections) {
              if (!ns.trim() || ns.trim() === "--") continue;
              const nH = parseEmailHeaders(ns);
              const nCT = (nH["content-type"] || "").toLowerCase();
              const nEnc = (nH["content-transfer-encoding"] || "").toLowerCase();
              let content = ns.split(/\r?\n\r?\n/).slice(1).join("\n\n").replace(/--$/, "").trim();
              if (nEnc === "base64") { try { content = atob(content.replace(/\s/g, "")); } catch {} }
              else if (nEnc === "quoted-printable") content = decodeQuotedPrintable(content);
              if (nCT.includes("text/plain") && !textBody) textBody = content;
              else if (nCT.includes("text/html") && !htmlBody) htmlBody = content;
            }
          }
          continue;
        }

        const sParts = section.split(/\r?\n\r?\n/);
        let content = sParts.slice(1).join("\n\n").replace(/--$/, "").trim();
        if (sEnc === "base64") { try { content = atob(content.replace(/\s/g, "")); } catch {} }
        else if (sEnc === "quoted-printable") content = decodeQuotedPrintable(content);
        if (sCT.includes("text/plain") && !textBody) textBody = content;
        else if (sCT.includes("text/html") && !htmlBody) htmlBody = content;
      }
      return { text: textBody, html: htmlBody };
    }
  }

  let textBody = body;
  if (encoding.toLowerCase() === "quoted-printable") textBody = decodeQuotedPrintable(body);
  else if (encoding.toLowerCase() === "base64") { try { textBody = atob(body.replace(/\s/g, "")); } catch {} }
  return { text: textBody, html: null };
}

function isAutoReply(subject: string, from: string): boolean {
  const s = (subject || "").toLowerCase();
  const f = (from || "").toLowerCase();
  const patterns = ["auto-reply", "autoreply", "automatic reply", "out of office", "mailer-daemon", "postmaster@", "noreply@", "no-reply@", "undeliverable", "delivery status"];
  return patterns.some(p => s.includes(p) || f.includes(p));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const imapUser = Deno.env.get("HOSTINGER_BUSINESS_EMAIL");
    const imapPass = Deno.env.get("HOSTINGER_BUSINESS_PASSWORD");
    if (!imapUser || !imapPass) throw new Error("Business email credentials not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Connecting to IMAP for business@propscholar.com...");
    const conn = await Deno.connectTls({ hostname: IMAP_HOST, port: IMAP_PORT });
    await readResponse(conn);

    const loginResp = await sendCommand(conn, "A1", `LOGIN ${imapUser} ${imapPass}`);
    if (!loginResp.includes("A1 OK")) throw new Error("IMAP login failed");

    const selectResp = await sendCommand(conn, "A2", "SELECT INBOX");
    const existsMatch = selectResp.match(/\* (\d+) EXISTS/);
    const totalMessages = existsMatch ? parseInt(existsMatch[1]) : 0;
    console.log(`Total messages in inbox: ${totalMessages}`);

    if (totalMessages === 0) {
      await sendCommand(conn, "A99", "LOGOUT");
      try { conn.close(); } catch {}
      return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch last 30 messages
    const startMsg = Math.max(1, totalMessages - 29);
    const fetchResp = await sendCommand(conn, "A3", `FETCH ${startMsg}:${totalMessages} (BODY.PEEK[])`);

    const emailBlocks = fetchResp.split(/\* \d+ FETCH/);
    let processed = 0;

    for (const block of emailBlocks) {
      if (!block.trim()) continue;
      try {
        const headers = parseEmailHeaders(block);
        const from = headers["from"] || "";
        const to = headers["to"] || "";
        const subject = headers["subject"] || "(No Subject)";
        const messageId = headers["message-id"] || "";
        const dateStr = headers["date"] || "";

        if (!from || isAutoReply(subject, from)) continue;

        const fromEmail = extractEmail(from);
        const fromName = extractName(from);

        // Skip if already exists
        if (messageId) {
          const { data: existing } = await supabase
            .from("business_emails")
            .select("id")
            .eq("message_id", messageId)
            .maybeSingle();
          if (existing) continue;
        }

        const { text, html } = extractBody(block);
        let receivedAt: string;
        try { receivedAt = new Date(dateStr).toISOString(); } catch { receivedAt = new Date().toISOString(); }

        await supabase.from("business_emails").insert({
          message_id: messageId || null,
          direction: "inbound",
          from_email: fromEmail,
          from_name: fromName,
          to_email: BUSINESS_EMAIL,
          subject,
          body_text: text?.substring(0, 50000) || null,
          body_html: html?.substring(0, 100000) || null,
          status: "unread",
          received_at: receivedAt,
        });

        processed++;
        console.log(`Stored: ${subject} from ${fromEmail}`);
      } catch (e) {
        console.error("Error processing email:", e);
      }
    }

    await sendCommand(conn, "A99", "LOGOUT");
    try { conn.close(); } catch {}

    console.log(`Processed ${processed} new business emails`);
    return new Response(JSON.stringify({ processed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Error polling business inbox:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
