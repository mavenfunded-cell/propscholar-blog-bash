import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// IMAP connection details
const IMAP_HOST = "mail.hostinger.com";
const IMAP_PORT = 993;
const IMAP_USER = "support@propscholar.com";

// Simple IMAP command sender/receiver
async function sendCommand(conn: Deno.TlsConn, tag: string, command: string): Promise<string> {
  const encoder = new TextEncoder();
  const fullCommand = `${tag} ${command}\r\n`;
  await conn.write(encoder.encode(fullCommand));
  
  const decoder = new TextDecoder();
  const buffer = new Uint8Array(65536);
  let response = "";
  
  while (true) {
    const n = await conn.read(buffer);
    if (n === null) break;
    response += decoder.decode(buffer.subarray(0, n));
    
    // Check if response is complete (ends with tagged response)
    if (response.includes(`${tag} OK`) || response.includes(`${tag} NO`) || response.includes(`${tag} BAD`)) {
      break;
    }
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

// Strip quoted content and signatures
function stripQuotedContent(text: string): string {
  if (!text) return "";
  
  const lines = text.split("\n");
  const cleanLines: string[] = [];
  
  for (const line of lines) {
    if (
      line.match(/^On .+ wrote:$/i) ||
      line.match(/^-{2,}.*Original Message.*-{2,}$/i) ||
      line.match(/^>{1,}/) ||
      line.match(/^From:.*@/i) ||
      line.match(/^Sent:.*\d{4}/i) ||
      line.match(/^--\s*$/)
    ) {
      break;
    }
    cleanLines.push(line);
  }
  
  return cleanLines.join("\n").trim();
}

// Check if email is a bounce or auto-reply
function isAutoReply(subject: string, from: string): boolean {
  const subjectLower = subject?.toLowerCase() || "";
  const fromLower = from?.toLowerCase() || "";
  
  const autoReplyPatterns = [
    "auto-reply", "autoreply", "automatic reply", "out of office",
    "ooo:", "vacation reply", "delivery status notification",
    "undeliverable", "mailer-daemon", "postmaster@", "noreply@", "no-reply@",
  ];
  
  return autoReplyPatterns.some(
    (pattern) => subjectLower.includes(pattern) || fromLower.includes(pattern)
  );
}

// Extract email address from "Name <email@example.com>" format
function extractEmail(emailString: string): string {
  if (!emailString) return "";
  const match = emailString.match(/<([^>]+)>/);
  return match ? match[1] : emailString.trim();
}

// Extract name from email string
function extractName(emailString: string): string {
  if (!emailString) return "";
  const match = emailString.match(/^([^<]+)</);
  return match ? match[1].trim() : emailString.split("@")[0];
}

// Parse email headers from raw email
function parseEmailHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const headerSection = raw.split("\r\n\r\n")[0] || raw.split("\n\n")[0];
  
  let currentHeader = "";
  let currentValue = "";
  
  for (const line of headerSection.split(/\r?\n/)) {
    if (line.match(/^[A-Za-z-]+:/)) {
      if (currentHeader) {
        headers[currentHeader.toLowerCase()] = currentValue.trim();
      }
      const colonIndex = line.indexOf(":");
      currentHeader = line.substring(0, colonIndex);
      currentValue = line.substring(colonIndex + 1);
    } else if (line.match(/^\s/) && currentHeader) {
      currentValue += " " + line.trim();
    }
  }
  
  if (currentHeader) {
    headers[currentHeader.toLowerCase()] = currentValue.trim();
  }
  
  return headers;
}

// Parse email body from raw email
function parseEmailBody(raw: string): { text: string; html: string | null } {
  const parts = raw.split(/\r?\n\r?\n/);
  if (parts.length < 2) return { text: "", html: null };
  
  const body = parts.slice(1).join("\n\n");
  
  // Check for multipart
  const contentType = parseEmailHeaders(raw)["content-type"] || "";
  
  if (contentType.includes("multipart")) {
    const boundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/i);
    if (boundaryMatch) {
      const boundary = boundaryMatch[1];
      const sections = body.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      
      let textBody = "";
      let htmlBody: string | null = null;
      
      for (const section of sections) {
        if (section.includes("text/plain")) {
          const sectionParts = section.split(/\r?\n\r?\n/);
          textBody = sectionParts.slice(1).join("\n\n").replace(/--$/, "").trim();
        } else if (section.includes("text/html")) {
          const sectionParts = section.split(/\r?\n\r?\n/);
          htmlBody = sectionParts.slice(1).join("\n\n").replace(/--$/, "").trim();
        }
      }
      
      return { text: textBody, html: htmlBody };
    }
  }
  
  return { text: body, html: null };
}

// Decode quoted-printable or base64 encoded content
function decodeContent(content: string, encoding: string): string {
  if (!encoding) return content;
  
  encoding = encoding.toLowerCase();
  
  if (encoding === "base64") {
    try {
      return atob(content.replace(/\s/g, ""));
    } catch {
      return content;
    }
  }
  
  if (encoding === "quoted-printable") {
    return content
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }
  
  return content;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("IMAP poll triggered at:", new Date().toISOString());
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let conn: Deno.TlsConn | null = null;
  let processedCount = 0;
  let errorCount = 0;
  const imapPassword = Deno.env.get("IMAP_PASSWORD") || "";

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Connect to IMAP server
    conn = await Deno.connectTls({
      hostname: IMAP_HOST,
      port: IMAP_PORT,
    });
    
    // Read greeting
    const greeting = await readResponse(conn);
    console.log("IMAP greeting received");

    // Login
    let tagNum = 1;
    const loginResp = await sendCommand(conn, `A${tagNum++}`, `LOGIN "${IMAP_USER}" "${imapPassword}"`);
    if (!loginResp.includes("OK")) {
      throw new Error("IMAP login failed");
    }
    console.log("IMAP login successful");

    // Select INBOX
    const selectResp = await sendCommand(conn, `A${tagNum++}`, "SELECT INBOX");
    console.log("Selected INBOX");

    // Search for unseen messages
    const searchResp = await sendCommand(conn, `A${tagNum++}`, "SEARCH UNSEEN");
    const uidMatch = searchResp.match(/\* SEARCH([\d\s]*)/);
    const messageUids = uidMatch && uidMatch[1] ? uidMatch[1].trim().split(/\s+/).filter(Boolean) : [];
    
    console.log(`Found ${messageUids.length} unseen messages`);

    for (const uid of messageUids) {
      if (!uid) continue;
      
      try {
        console.log(`Processing message ${uid}`);
        
        // Fetch the message
        const fetchResp = await sendCommand(conn, `A${tagNum++}`, `FETCH ${uid} (RFC822)`);
        
        // Extract raw email from response
        const rawMatch = fetchResp.match(/\{(\d+)\}\r?\n([\s\S]*?)(?=\r?\nA\d+ OK|\r?\n\))/);
        if (!rawMatch) {
          console.log(`Could not parse message ${uid}`);
          continue;
        }
        
        const rawEmail = rawMatch[2];
        const headers = parseEmailHeaders(rawEmail);
        
        const fromHeader = headers["from"] || "";
        const senderEmail = extractEmail(fromHeader);
        const senderName = extractName(fromHeader);
        const subject = headers["subject"] || "No Subject";
        const messageId = headers["message-id"]?.replace(/[<>]/g, "") || null;
        const inReplyTo = headers["in-reply-to"]?.replace(/[<>]/g, "") || null;
        const references = headers["references"] || null;
        const contentTransferEncoding = headers["content-transfer-encoding"] || "";

        // Skip auto-replies
        if (isAutoReply(subject, senderEmail)) {
          console.log(`Skipping auto-reply from: ${senderEmail}`);
          await sendCommand(conn, `A${tagNum++}`, `STORE ${uid} +FLAGS (\\Seen)`);
          continue;
        }

        // Parse body
        const { text, html } = parseEmailBody(rawEmail);
        const decodedText = decodeContent(text, contentTransferEncoding);
        const cleanBody = stripQuotedContent(decodedText);

        if (!cleanBody.trim()) {
          console.log(`Skipping empty email from: ${senderEmail}`);
          await sendCommand(conn, `A${tagNum++}`, `STORE ${uid} +FLAGS (\\Seen)`);
          continue;
        }

        // Check for duplicate
        if (messageId) {
          const { data: existingMessage } = await supabase
            .from("support_messages")
            .select("id")
            .eq("message_id", messageId)
            .single();

          if (existingMessage) {
            console.log(`Duplicate message: ${messageId}`);
            await sendCommand(conn, `A${tagNum++}`, `STORE ${uid} +FLAGS (\\Seen)`);
            continue;
          }
        }

        // Find existing ticket
        let ticketId: string | null = null;

        if (inReplyTo || references) {
          const { data: foundTicket } = await supabase.rpc("find_ticket_by_message_ref", {
            _message_id: messageId || "",
            _in_reply_to: inReplyTo || "",
            _references: references || "",
          });
          
          if (foundTicket) {
            ticketId = foundTicket;
          }
        }

        if (!ticketId) {
          const ticketMatch = subject.match(/\[Ticket #(\d+)\]/i);
          if (ticketMatch) {
            const { data: ticketByNumber } = await supabase
              .from("support_tickets")
              .select("id")
              .eq("ticket_number", parseInt(ticketMatch[1]))
              .single();
            
            if (ticketByNumber) {
              ticketId = ticketByNumber.id;
            }
          }
        }

        // Find user
        const { data: userCoins } = await supabase
          .from("user_coins")
          .select("user_id")
          .eq("email", senderEmail)
          .single();

        // Create ticket if needed
        if (!ticketId) {
          const { data: newTicket, error: ticketError } = await supabase
            .from("support_tickets")
            .insert({
              subject,
              user_email: senderEmail,
              user_id: userCoins?.user_id || null,
              original_message_id: messageId,
              status: "open",
            })
            .select("id, ticket_number")
            .single();

          if (ticketError) {
            console.error("Error creating ticket:", ticketError);
            errorCount++;
            continue;
          }

          ticketId = newTicket.id;
          console.log(`Created ticket #${newTicket.ticket_number}`);
        }

        // Insert message
        const { error: messageError } = await supabase.from("support_messages").insert({
          ticket_id: ticketId,
          sender_email: senderEmail,
          sender_name: senderName,
          sender_type: "user",
          body: cleanBody,
          body_html: html,
          message_id: messageId,
          in_reply_to: inReplyTo,
          attachments: [],
        });

        if (messageError) {
          console.error("Error inserting message:", messageError);
          errorCount++;
          continue;
        }

        // Mark as seen
        await sendCommand(conn, `A${tagNum++}`, `STORE ${uid} +FLAGS (\\Seen)`);
        processedCount++;
        console.log(`Processed email from: ${senderEmail}`);
        
      } catch (msgError) {
        console.error(`Error processing message ${uid}:`, msgError);
        errorCount++;
      }
    }

    // Logout
    await sendCommand(conn, `A${tagNum++}`, "LOGOUT");
    conn.close();

    console.log(`IMAP poll done. Processed: ${processedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount, 
        errors: errorCount,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("IMAP poll error:", error);
    
    if (conn) {
      try {
        conn.close();
      } catch (e) {}
    }

    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
