import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .normalize('NFKD') // split accented chars into base + diacritic
    .replace(/[\u0300-\u036f]/g, '') // strip the diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // any run of non-alphanumerics -> single dash
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes
}
