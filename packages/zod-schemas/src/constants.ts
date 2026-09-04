import { Code, DollarSign, Ellipsis, Megaphone, ScrollText, UserStar } from 'lucide-react';

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
