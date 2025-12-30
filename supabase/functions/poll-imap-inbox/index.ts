import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hostinger IMAP configuration - ONLY for support@propscholar.com
const IMAP_HOST = "imap.hostinger.com";
const IMAP_PORT = 993;
const SUPPORT_EMAIL = "support@propscholar.com";

// Attachment interface
interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content?: string; // Base64 encoded content
  url?: string; // URL if stored somewhere
}

// Simple IMAP command sender/receiver with timeout
async function sendCommand(conn: Deno.TlsConn, tag: string, command: string): Promise<string> {
  const encoder = new TextEncoder();
  const fullCommand = `${tag} ${command}\r\n`;
  // Don't log password
  const logCmd = command.includes("LOGIN") ? "LOGIN ****" : command.substring(0, 80);
  console.log(`IMAP >>> ${tag} ${logCmd}`);
  await conn.write(encoder.encode(fullCommand));
  
  const decoder = new TextDecoder();
  const buffer = new Uint8Array(65536);
  let response = "";
  const startTime = Date.now();
  const timeout = 30000; // 30 second timeout
  
  while (true) {
    if (Date.now() - startTime > timeout) {
      console.error("IMAP timeout. Response so far:", response);
      throw new Error(`IMAP command timeout: ${tag}`);
    }
    
    const n = await conn.read(buffer);
    if (n === null) break;
    response += decoder.decode(buffer.subarray(0, n));
    
    // Check if response is complete (ends with tagged response)
    if (response.includes(`${tag} OK`) || response.includes(`${tag} NO`) || response.includes(`${tag} BAD`)) {
      break;
    }
  }
  
  // Log response without sensitive data
  const logResponse = response.length > 300 ? response.substring(0, 300) + "..." : response;
  console.log(`IMAP <<< ${logResponse.replace(/\r?\n/g, " ")}`);
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
    // Stop at quoted content markers
    if (
      line.match(/^On .+ wrote:$/i) ||
      line.match(/^-{2,}.*Original Message.*-{2,}$/i) ||
      line.match(/^>{1,}/) ||
      line.match(/^From:.*@/i) ||
      line.match(/^Sent:.*\d{4}/i) ||
      line.match(/^--\s*$/) ||
      line.match(/^_{3,}/) ||
      line.match(/^Forwarded message/i)
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
    "do-not-reply@", "donotreply@", "bounce", "failure notice",
  ];
  
  return autoReplyPatterns.some(
    (pattern) => subjectLower.includes(pattern) || fromLower.includes(pattern)
  );
}

// Extract email address from "Name <email@example.com>" format
function extractEmail(emailString: string): string {
  if (!emailString) return "";
  const match = emailString.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase().trim() : emailString.trim().toLowerCase();
}

// Extract name from email string
function extractName(emailString: string): string {
  if (!emailString) return "";
  const match = emailString.match(/^"?([^"<]+)"?\s*</);
  if (match) return match[1].trim();
  const emailMatch = emailString.match(/<([^>]+)>/);
  if (emailMatch) return emailMatch[1].split("@")[0];
  return emailString.split("@")[0];
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

// Parse MIME parts including attachments
function parseMimeParts(raw: string): { text: string; html: string | null; attachments: EmailAttachment[] } {
  const parts = raw.split(/\r?\n\r?\n/);
  if (parts.length < 2) return { text: "", html: null, attachments: [] };
  
  const body = parts.slice(1).join("\n\n");
  const headers = parseEmailHeaders(raw);
  const contentType = headers["content-type"] || "";
  const attachments: EmailAttachment[] = [];
  
  if (contentType.includes("multipart")) {
    const boundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/i);
    if (boundaryMatch) {
      const boundary = boundaryMatch[1];
      const escapedBoundary = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const sections = body.split(new RegExp(`--${escapedBoundary}`));
      
      let textBody = "";
      let htmlBody: string | null = null;
      
      for (const section of sections) {
        if (!section.trim() || section.trim() === "--") continue;
        
        const sectionHeaders = parseEmailHeaders(section);
        const sectionContentType = (sectionHeaders["content-type"] || "").toLowerCase();
        const contentDisposition = (sectionHeaders["content-disposition"] || "").toLowerCase();
        const contentTransferEncoding = (sectionHeaders["content-transfer-encoding"] || "").toLowerCase();
        
        // Check for nested multipart
        if (sectionContentType.includes("multipart")) {
          const nestedBoundaryMatch = sectionContentType.match(/boundary="?([^";\s]+)"?/i);
          if (nestedBoundaryMatch) {
            const nestedResult = parseMimeParts(section);
            if (nestedResult.text && !textBody) textBody = nestedResult.text;
            if (nestedResult.html && !htmlBody) htmlBody = nestedResult.html;
            attachments.push(...nestedResult.attachments);
          }
          continue;
        }
        
        // Get the actual content (after headers)
        const sectionParts = section.split(/\r?\n\r?\n/);
        let content = sectionParts.slice(1).join("\n\n").replace(/--$/, "").trim();
        
        // Check if this is an attachment
        const isAttachment = contentDisposition.includes("attachment") || 
                             contentDisposition.includes("inline") ||
                             (sectionContentType && !sectionContentType.includes("text/plain") && !sectionContentType.includes("text/html"));
        
        // Extract filename from content-disposition or content-type
        let filename = "";
        const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/i) || 
                              sectionContentType.match(/name="?([^";\n]+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1].trim();
        }
        
        if (isAttachment && (filename || sectionContentType.includes("image/") || sectionContentType.includes("application/"))) {
          // This is an attachment
          const attachment: EmailAttachment = {
            filename: filename || `attachment_${attachments.length + 1}`,
            contentType: sectionContentType.split(";")[0].trim(),
            size: content.length,
            content: content // Store the base64/raw content
          };
          
          // Calculate approximate size for base64 content
          if (contentTransferEncoding === "base64") {
            attachment.size = Math.floor(content.replace(/\s/g, "").length * 0.75);
          }
          
          attachments.push(attachment);
          console.log(`Found attachment: ${attachment.filename} (${attachment.contentType}, ${attachment.size} bytes)`);
        } else if (sectionContentType.includes("text/plain")) {
          textBody = content;
          // Decode if needed
          if (contentTransferEncoding === "base64") {
            try {
              textBody = atob(content.replace(/\s/g, ""));
            } catch { /* keep original */ }
          } else if (contentTransferEncoding === "quoted-printable") {
            textBody = decodeQuotedPrintable(content);
          }
        } else if (sectionContentType.includes("text/html")) {
          htmlBody = content;
          if (contentTransferEncoding === "base64") {
            try {
              htmlBody = atob(content.replace(/\s/g, ""));
            } catch { /* keep original */ }
          } else if (contentTransferEncoding === "quoted-printable") {
            htmlBody = decodeQuotedPrintable(content);
          }
        }
      }
      
      return { text: textBody, html: htmlBody, attachments };
    }
  }
  
  return { text: body, html: null, attachments };
}

// Decode quoted-printable content
function decodeQuotedPrintable(content: string): string {
  return content
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// Decode content based on transfer encoding
function decodeContent(content: string, encoding: string): string {
  if (!encoding || !content) return content || "";
  
  encoding = encoding.toLowerCase().trim();
  
  if (encoding === "base64") {
    try {
      return atob(content.replace(/\s/g, ""));
    } catch {
      console.log("Base64 decode failed, returning original");
      return content;
    }
  }
  
  if (encoding === "quoted-printable") {
    return decodeQuotedPrintable(content);
  }
  
  return content;
}

// Strip HTML tags to get plain text
function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// Upload attachment to Supabase storage and return URL
async function uploadAttachment(
  supabase: any,
  ticketId: string,
  attachment: EmailAttachment
): Promise<string | null> {
  try {
    if (!attachment.content) return null;
    
    // Decode base64 content to binary
    let binaryContent: Uint8Array;
    try {
      const cleanContent = attachment.content.replace(/\s/g, "");
      const binaryString = atob(cleanContent);
      binaryContent = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        binaryContent[i] = binaryString.charCodeAt(i);
      }
    } catch (e) {
      console.error("Failed to decode attachment content:", e);
      return null;
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const safeFilename = attachment.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${ticketId}/${timestamp}-${random}-${safeFilename}`;
    
    // Upload to storage
    const { data, error } = await supabase.storage
      .from("ticket-attachments")
      .upload(filePath, binaryContent, {
        contentType: attachment.contentType,
        upsert: false
      });
    
    if (error) {
      console.error("Storage upload error:", error);
      return null;
    }
    
    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from("ticket-attachments")
      .getPublicUrl(filePath);
    
    console.log(`Uploaded attachment: ${attachment.filename} -> ${publicUrl.publicUrl}`);
    return publicUrl.publicUrl;
  } catch (e) {
    console.error("Failed to upload attachment:", e);
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Hostinger IMAP poll triggered at:", new Date().toISOString());
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let conn: Deno.TlsConn | null = null;
  let processedCount = 0;
  let errorCount = 0;
  
  // Get Hostinger credentials from environment variables
  const imapUser = Deno.env.get("HOSTINGER_SUPPORT_EMAIL") || "";
  const imapPassword = Deno.env.get("HOSTINGER_SUPPORT_PASSWORD") || "";
  
  if (!imapUser || !imapPassword) {
    console.error("Hostinger IMAP credentials not configured");
    return new Response(
      JSON.stringify({ 
        error: "Hostinger IMAP credentials not configured", 
        success: false,
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  console.log(`Using Hostinger support email: ${SUPPORT_EMAIL}`);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`Connecting to Hostinger IMAP at ${IMAP_HOST}:${IMAP_PORT}...`);
    
    // Connect to Hostinger IMAP server
    conn = await Deno.connectTls({
      hostname: IMAP_HOST,
      port: IMAP_PORT,
    });
    
    console.log("Connected to Hostinger IMAP server");
    
    // Read greeting
    const greeting = await readResponse(conn);
    console.log("IMAP greeting received");

    // Login with Hostinger credentials
    let tagNum = 1;
    const loginResp = await sendCommand(conn, `A${tagNum++}`, `LOGIN "${imapUser}" "${imapPassword}"`);
    if (!loginResp.includes("OK")) {
      const errorMsg = loginResp.includes("AUTHENTICATIONFAILED") || loginResp.includes("NO") 
        ? "Hostinger authentication failed - check username and password"
        : "Hostinger IMAP login failed";
      throw new Error(errorMsg);
    }
    console.log("Hostinger IMAP login successful");

    // Select INBOX
    const selectResp = await sendCommand(conn, `A${tagNum++}`, "SELECT INBOX");
    console.log("Selected INBOX");

    // Search for unseen messages
    const searchResp = await sendCommand(conn, `A${tagNum++}`, "SEARCH UNSEEN");
    const uidMatch = searchResp.match(/\* SEARCH([\d\s]*)/);
    const messageUids = uidMatch && uidMatch[1] ? uidMatch[1].trim().split(/\s+/).filter(Boolean) : [];
    
    console.log(`Found ${messageUids.length} unread message(s)`);

    if (messageUids.length === 0) {
      // Logout and close connection
      await sendCommand(conn, `A${tagNum++}`, "LOGOUT");
      conn.close();
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No new emails",
          processed: 0, 
          errors: 0,
          email: SUPPORT_EMAIL,
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    for (const uid of messageUids) {
      if (!uid) continue;
      
      try {
        console.log(`Processing message ${uid}...`);
        
        // Fetch the message
        const fetchResp = await sendCommand(conn, `A${tagNum++}`, `FETCH ${uid} (RFC822)`);
        
        // Extract raw email from response
        const rawMatch = fetchResp.match(/\{(\d+)\}\r?\n([\s\S]*?)(?=\r?\nA\d+ OK|\r?\n\))/);
        if (!rawMatch) {
          console.log(`Could not parse message ${uid}, trying alternate parsing`);
          // Try alternate parsing
          const altMatch = fetchResp.match(/\* \d+ FETCH[^{]*\{(\d+)\}\r?\n([\s\S]+)/);
          if (!altMatch) {
            console.log(`Failed to parse message ${uid}`);
            continue;
          }
        }
        
        const rawEmail = rawMatch ? rawMatch[2] : fetchResp;
        const headers = parseEmailHeaders(rawEmail);
        
        const fromHeader = headers["from"] || "";
        const senderEmail = extractEmail(fromHeader);
        const senderName = extractName(fromHeader);
        const subject = headers["subject"] || "No Subject";
        const messageId = headers["message-id"]?.replace(/[<>]/g, "").trim() || null;
        const inReplyTo = headers["in-reply-to"]?.replace(/[<>]/g, "").trim() || null;
        const references = headers["references"] || null;
        const contentTransferEncoding = headers["content-transfer-encoding"] || "";

        console.log(`Email from: ${senderEmail}, subject: ${subject.substring(0, 60)}`);

        // Skip auto-replies and bounces
        if (isAutoReply(subject, senderEmail)) {
          console.log(`Skipping auto-reply/bounce from: ${senderEmail}`);
          await sendCommand(conn, `A${tagNum++}`, `STORE ${uid} +FLAGS (\\Seen)`);
          continue;
        }

        // Skip emails from self (avoid loops)
        if (senderEmail === SUPPORT_EMAIL.toLowerCase()) {
          console.log(`Skipping email from self: ${senderEmail}`);
          await sendCommand(conn, `A${tagNum++}`, `STORE ${uid} +FLAGS (\\Seen)`);
          continue;
        }

        // Parse body AND attachments
        const { text, html, attachments: rawAttachments } = parseMimeParts(rawEmail);
        let bodyText = text;
        
        // Decode if needed
        if (contentTransferEncoding) {
          bodyText = decodeContent(text, contentTransferEncoding);
        }
        
        // Fall back to HTML if no text
        if (!bodyText.trim() && html) {
          bodyText = stripHtml(html);
        }
        
        const cleanBody = stripQuotedContent(bodyText);

        if (!cleanBody.trim()) {
          console.log(`Skipping empty email from: ${senderEmail}`);
          await sendCommand(conn, `A${tagNum++}`, `STORE ${uid} +FLAGS (\\Seen)`);
          continue;
        }

        // Check for duplicate by message_id
        if (messageId) {
          const { data: existingMessage } = await supabase
            .from("support_messages")
            .select("id")
            .eq("message_id", messageId)
            .maybeSingle();

          if (existingMessage) {
            console.log(`Duplicate message detected: ${messageId}`);
            await sendCommand(conn, `A${tagNum++}`, `STORE ${uid} +FLAGS (\\Seen)`);
            continue;
          }
        }

        // Find existing ticket by message references
        let ticketId: string | null = null;

        if (inReplyTo || references) {
          const { data: foundTicket } = await supabase.rpc("find_ticket_by_message_ref", {
            _message_id: messageId || "",
            _in_reply_to: inReplyTo || "",
            _references: references || "",
          });
          
          if (foundTicket) {
            ticketId = foundTicket;
            console.log(`Found ticket by message reference: ${ticketId}`);
          }
        }

        // Find ticket by ticket number in subject [Ticket #ID]
        if (!ticketId) {
          const ticketMatch = subject.match(/\[Ticket #(\d+)\]/i);
          if (ticketMatch) {
            const { data: ticketByNumber } = await supabase
              .from("support_tickets")
              .select("id")
              .eq("ticket_number", parseInt(ticketMatch[1]))
              .maybeSingle();
            
            if (ticketByNumber) {
              ticketId = ticketByNumber.id;
              console.log(`Found ticket by number in subject: ${ticketId}`);
            }
          }
        }

        // Find open ticket for this sender
        if (!ticketId) {
          const { data: openTicket } = await supabase
            .from("support_tickets")
            .select("id")
            .eq("user_email", senderEmail)
            .neq("status", "closed")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (openTicket) {
            ticketId = openTicket.id;
            console.log(`Found existing open ticket for sender: ${ticketId}`);
          }
        }

        // Find user by email
        const { data: userCoins } = await supabase
          .from("user_coins")
          .select("user_id")
          .eq("email", senderEmail)
          .maybeSingle();

        // Create new ticket if needed
        let isNewTicket = false;
        let ticketNumber: number | null = null;
        
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
          ticketNumber = newTicket.ticket_number;
          isNewTicket = true;
          console.log(`Created new ticket #${newTicket.ticket_number}`);
        }

        // Upload attachments to storage and get URLs
        const processedAttachments: { filename: string; contentType: string; size: number; url: string }[] = [];
        
        if (rawAttachments.length > 0) {
          console.log(`Processing ${rawAttachments.length} attachment(s)...`);
          
          for (const att of rawAttachments) {
            const url = await uploadAttachment(supabase, ticketId!, att);
            if (url) {
              processedAttachments.push({
                filename: att.filename,
                contentType: att.contentType,
                size: att.size,
                url: url
              });
            }
          }
          
          console.log(`Uploaded ${processedAttachments.length} attachment(s)`);
        }

        // Insert message with attachments
        const { error: messageError } = await supabase.from("support_messages").insert({
          ticket_id: ticketId,
          sender_email: senderEmail,
          sender_name: senderName,
          sender_type: "user",
          body: cleanBody,
          body_html: html,
          message_id: messageId,
          in_reply_to: inReplyTo,
          attachments: processedAttachments,
        });

        if (messageError) {
          console.error("Error inserting message:", messageError);
          errorCount++;
          continue;
        }

        // Update ticket with last reply info
        await supabase
          .from("support_tickets")
          .update({
            status: "open",
            last_reply_at: new Date().toISOString(),
            last_reply_by: "user",
          })
          .eq("id", ticketId);

        // Send auto-reply for NEW tickets only
        if (isNewTicket && ticketNumber) {
          try {
            const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
            const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
            
            console.log(`Sending auto-reply for new ticket #${ticketNumber} to ${senderEmail}`);
            
            const autoReplyResponse = await fetch(`${supabaseUrl}/functions/v1/ticket-auto-reply`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                to: senderEmail,
                ticketNumber: ticketNumber,
                subject: subject,
                ticketId: ticketId,
              }),
            });
            
            const autoReplyResult = await autoReplyResponse.json();
            console.log("Auto-reply result:", autoReplyResult);
          } catch (autoReplyError) {
            console.error("Failed to send auto-reply:", autoReplyError);
            // Don't fail the main process if auto-reply fails
          }
        }

        // Mark as seen ONLY after successful processing
        await sendCommand(conn, `A${tagNum++}`, `STORE ${uid} +FLAGS (\\Seen)`);
        processedCount++;
        console.log(`Successfully processed message ${uid} with ${processedAttachments.length} attachment(s)`);
        
      } catch (msgError) {
        console.error(`Error processing message ${uid}:`, msgError);
        errorCount++;
      }
    }

    // Logout
    await sendCommand(conn, `A${tagNum++}`, "LOGOUT");
    conn.close();

    console.log(`IMAP sync complete. Processed: ${processedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount, 
        errors: errorCount,
        email: SUPPORT_EMAIL,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Hostinger IMAP poll error:", error);
    
    if (conn) {
      try {
        conn.close();
      } catch {}
    }

    return new Response(
      JSON.stringify({ 
        error: error.message, 
        success: false,
        email: SUPPORT_EMAIL,
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
