export type StepHandle = {
  /** Validate the step's form; if valid, persist it and return true. */
  save: () => Promise<boolean>;
};

export function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'project'
  );
}
