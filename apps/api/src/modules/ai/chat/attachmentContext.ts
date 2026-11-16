import type { ChatAttachmentType } from '@nexus/types';
import { chatAttachmentsSchema } from '@nexus/zod-schemas';

const MAX_ATTACHMENT_CHARS = 20_000;
const MAX_TURN_CHARS = 40_000;

/** Attachments stored in a message's `metadata.attachments`; anything malformed is ignored. */
export function attachmentsOf(
  metadata: Record<string, unknown> | null | undefined,
): ChatAttachmentType[] {
  const parsed = chatAttachmentsSchema.safeParse(metadata?.attachments);
  return parsed.success ? parsed.data : [];
}

/** Escapes a filename for the `<attachment>` block's attribute values. */
const escape = (value: string) => value.replace(/"/g, '&quot;');

/**
 * The current turn's attachments, injected in full within the per-file (20k) and per-turn (40k)
 * budgets. The text is framed as data by the surrounding system prompt — never instructions.
 */
export function formatCurrentTurnAttachments(
  attachments: { name: string; mimeType: string; text: string }[],
): string {
  if (attachments.length === 0) return '';

  let remaining = MAX_TURN_CHARS;
  const blocks: string[] = [];

  for (const attachment of attachments) {
    if (remaining <= 0) {
      blocks.push(
        `<attachment name="${escape(attachment.name)}" type="${escape(attachment.mimeType)}" omitted="true"></attachment>`,
      );
      continue;
    }

    const slice = attachment.text.slice(0, Math.min(MAX_ATTACHMENT_CHARS, remaining));
    const truncated = slice.length < attachment.text.length;

    blocks.push(
      `<attachment name="${escape(attachment.name)}" type="${escape(attachment.mimeType)}" chars="${slice.length}"${truncated ? ' truncated="true"' : ''}>${slice}</attachment>`,
    );

    remaining -= slice.length;
  }

  return blocks.join('\n\n');
}

/** One-line stubs for earlier-turn attachments; the model reopens them with read_attachment. */
export function formatAttachmentStubs(
  attachments: { name: string; chars: number }[],
): string {
  if (attachments.length === 0) return '';
  return attachments
    .map((attachment) => `[Attached: ${attachment.name}, ${attachment.chars} chars. Use read_attachment to reopen.]`)
    .join('\n');
}
