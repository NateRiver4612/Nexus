import type { LucideIcon } from 'lucide-react';
import {
  Calculator,
  CalendarRange,
  Code,
  DollarSign,
  Ellipsis,
  FileText,
  Megaphone,
  NotebookPen,
  Presentation,
  Rocket,
  ScrollText,
  Sprout,
  Table,
  UserStar,
  Wrench,
} from 'lucide-react';

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB — bigger than your avatar upload limit, docs are larger
export const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/csv',
  'text/markdown',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const DEFAULT_ONBOARDING_CATEGORIES = [
  {
    label: 'Marketing',
    value: 'marketing',
    icon: Megaphone,
  },
  {
    label: 'Finance',
    value: 'finance',
    icon: DollarSign,
  },
  {
    label: 'Research',
    value: 'research',
    icon: ScrollText,
  },
  {
    label: 'Engineering',
    value: 'engineering',
    icon: Code,
  },
  {
    label: 'Personal',
    value: 'personal',
    icon: UserStar,
  },
  {
    label: 'Other',
    value: 'other',
    icon: Ellipsis,
  },
];

/** Experience level picked in onboarding step 2 — scopes the generated kickoff plan. */
export const ONBOARDING_LEVELS = [
  {
    value: 'beginner',
    label: 'Foundations',
    description: 'Learn the basics, build something simple',
    icon: Sprout,
  },
  {
    value: 'intermediate',
    label: 'Solid Build',
    description: 'Move past the basics, build something real',
    icon: Wrench,
  },
  {
    value: 'advanced',
    label: 'Full Mastery',
    description: 'The full arc — light on fundamentals, real depth once you get to advanced',
    icon: Rocket,
  },
] as const;

/** Preset deliverable options shown in onboarding step 4 (custom is added by the user). */
/* Deliverable presets split in two:
   - DEFINITIONS: kind + label (shared — the seed creates these rows, client falls back to labels)
   - KIND_ICONS: kind + icon (display only on the cards). */
export const DELIVERABLE_DEFINITIONS = [
  { kind: 'word_report', label: 'Word report' },
  { kind: 'spreadsheet', label: 'Spreadsheet' },
  { kind: 'presentation', label: 'Presentation' },
  { kind: 'timeline', label: 'Timeline' },
  { kind: 'meeting_notes', label: 'Meeting notes' },
  { kind: 'research_summary', label: 'Research summary' },
  { kind: 'financial_model', label: 'Financial model' },
] as const;

type DeliverableKindLiteral = (typeof DELIVERABLE_DEFINITIONS)[number]['kind'] | 'custom';

export const DELIVERABLE_KIND_ICONS: Partial<Record<DeliverableKindLiteral, LucideIcon>> = {
  word_report: FileText,
  spreadsheet: Table,
  presentation: Presentation,
  timeline: CalendarRange,
  meeting_notes: NotebookPen,
  research_summary: ScrollText,
  financial_model: Calculator,
} as const;
