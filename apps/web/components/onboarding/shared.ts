export type StepHandle = {
  /** Validate the step's form; if valid, persist it and return true. */
  save: () => Promise<boolean>;
};
