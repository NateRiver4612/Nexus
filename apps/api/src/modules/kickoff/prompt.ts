import type { OnboardingDataType } from '@nexus/types';
import type { KnowledgeChunkGroup } from './context';

export type KickoffContext = {
  stepData: OnboardingDataType;
  knowledgeChunks: KnowledgeChunkGroup[];
};

export function buildKickoffPrompt({ stepData, knowledgeChunks }: KickoffContext): string {
  const { step1, step2, step4 } = stepData;

  const sections = [
    `Project name: ${step1.name}`,
    `Category: ${step1.category}`,
    step1?.description ? `Description: ${step1.description}` : null,
    `Goal: ${step2.context}`,
    `Requested deliverables: ${step4.deliverables.map((d) => d.name).join(', ')}`,
  ].filter(Boolean);

  const knowledgeSection = knowledgeChunks.length
    ? [
        '\nRelevant excerpts from uploaded resources (ranked by relevance to the project goal — use these to ground the plan, reference specific content where it applies):',
        ...knowledgeChunks.flatMap((group) => [
          `\nFrom "${group.title}":`,
          ...group.excerpts.map((excerpt) => `- ${excerpt}`),
        ]),
      ].join('\n')
    : '\nNo resources were uploaded — base the plan on the goal description alone.';

  return `${sections.join('\n')}\n${knowledgeSection}`;
}

export function buildKickoffSystemPrompt(stepData: OnboardingDataType): string {
  const category = stepData.step1.category.toLowerCase();
  const deliverables = stepData.step4.deliverables;
  const level = stepData.step2.level;

  const deliverablesGuidance = buildDeliverableGuidance(deliverables);
  const categoryGuidance = CATEGORY_GUIDANCE[category];
  const levelGuidance = LEVEL_GUIDANCE[level];

  return [KICKOFF_SYSTEM_PROMPT, categoryGuidance, deliverablesGuidance, levelGuidance]
    .filter(Boolean)
    .join('\n\n');
}

function buildDeliverableGuidance(
  selected: { name: string; kind: string; isCustom: boolean }[],
): string {
  const lines = selected
    .map((d) =>
      d.isCustom
        ? `Custom deliverable requested: "${d.name}" — infer what this should contain from its name \
and the user's goal description, and make sure at least one milestone produces it.`
        : (DELIVERABLE_KIND_GUIDANCE[d.kind] ?? ''),
    )
    .filter(Boolean);

  if (lines.length === 0) return '';
  return `The user wants the following deliverables produced by the end of this project:\n${lines.join('\n')}`;
}

export const KICKOFF_SYSTEM_PROMPT = `You are Nexus's project kickoff planner. Given a user's project goal, \
category, deliverable intent, context, and any uploaded resources, generate a realistic execution plan.

Infer the user's actual starting point from their goal description — don't assume they're a beginner by \
default, and don't impose introductory milestones on someone whose goal implies existing familiarity. \
Structure milestones the way this work would genuinely get built or learned, with complexity increasing \
naturally toward a real, working result — not a fixed template of phases.

Scale the number of milestones to the actual scope of the goal, typically 3-8. Never pad a small goal to \
hit a target count, and never compress a broad goal into too few milestones to be concrete. Each \
milestone's tasks must be actionable and specific to what the user described — never generic placeholders \
or "learn about X" tasks with no output.

Where a level covers multiple stages (e.g. advanced covering fundamentals through advanced), \
earlier stages should be represented but brief — the plan's size and depth should scale with how \
much of it is genuinely at the target difficulty, not spread evenly across every stage it touches.

Call the generate_project_plan tool with your result.`;

export const CATEGORY_GUIDANCE: Record<string, string> = {
  engineering: `Approach this like a senior engineer mentoring a self-taught developer. Favor \
current, idiomatic tooling and practices over outdated tutorial conventions — call out when a \
common tutorial approach is dated if you're confident about it. Structure milestones the way a \
real project actually gets built: environment/scaffolding first, core functionality next, then \
testing and error handling, then polish/deployment — not just a reading list of topics. Include \
at least one milestone that produces something runnable/demoable, not just "learned X".`,

  marketing: `Approach this like a senior marketer mentoring someone launching their first \
campaign, channel, or brand. Ground milestones in a real, measurable cycle: research/positioning \
first, then content or campaign creation, then a launch step, then a review/iterate step based on \
actual results — not a theory-only curriculum. Prefer tasks that produce something the user can \
point to (a content calendar, a draft campaign, a set of published posts) over tasks that are \
purely "study this concept".`,

  finance: `Approach this like a knowledgeable analyst or advisor mentoring someone building real \
financial literacy or a real financial project (e.g. a budget model, an investment thesis, a \
small business plan). Be precise and conservative — do not generate specific investment advice, \
tax guidance, or numeric recommendations; focus milestones on building the user's own analysis, \
models, or understanding rather than telling them what to do with their money. Favor tasks that \
produce a concrete artifact: a spreadsheet model, a budget, a documented analysis.`,

  research: `Approach this like an experienced researcher mentoring someone through a structured \
inquiry — academic, market, or personal research. Shape milestones around a real research \
process: define the question/scope, gather and organize sources, analyze findings, synthesize \
conclusions — resist front-loading everything into one giant "research" milestone. Favor tasks \
that produce a written artifact along the way (notes, a synthesis doc, a summary) rather than \
open-ended "read more" tasks with no output.`,

  personal: `Keep this lightweight and outcome-focused — the user is pursuing a personal project \
or habit, not a professional deliverable. Don't impose an "expert mentor" persona or heavy \
structure. Favor a small number of milestones with clearly achievable tasks, and avoid generating \
work that feels like a curriculum when the user just wants to make progress on something they \
care about.`,

  other: `The category wasn't specified precisely enough to apply domain-specific expertise. Rely \
primarily on the user's own goal description to shape the plan — ask for more concrete tasks \
grounded in what they actually wrote, rather than inventing generic best-practice structure for \
an unspecified domain.`,
};

const DELIVERABLE_KIND_GUIDANCE: Record<string, string> = {
  word_report: `Plan for a written report as one of the outputs — structure milestones so there's \
a clear point where findings/work get synthesized into prose, not left as scattered notes.`,
  financial_model: `Plan for a structured financial/numeric model as one of the outputs — include \
a milestone for defining the model's inputs/assumptions before building it out, and a review step \
before calling it done.`,
  presentation: `Plan for a presentation as one of the outputs — include a milestone late in the \
plan specifically for distilling the work into a small number of key points, not just reformatting \
everything already done.`,
  timeline: `Plan for a timeline as one of the outputs — keep the project's own milestones roughly \
mappable to how the timeline will read, so producing it is mostly synthesis, not new work.`,
  research_summary: `Plan for a research summary as one of the outputs — include a synthesis \
milestone that distills findings, separate from the research-gathering milestones themselves.`,
  meeting_notes: `This deliverable is usually a byproduct, not a milestone target — don't force a \
dedicated milestone for it unless the user's goal clearly involves running/documenting meetings.`,
  spreadsheet: `Plan for structured tabular output as one of the outputs — include a milestone for \
defining what's being tracked/calculated before populating it.`,
};

const LEVEL_GUIDANCE: Record<string, string> = {
  beginner: `Scope the plan to a simple, achievable outcome: cover the fundamentals of this goal \
and produce something basic but complete. This is the lightest of the three levels — keep the \
number of milestones and tasks small and contained. The least overall time and effort should go \
into this plan compared to intermediate or advanced.`,

  intermediate: `Scope the plan to a moderately challenging outcome. Cover the fundamentals \
quickly and lightly — a brief milestone at most, not full depth — and put the majority of the \
plan's milestones, tasks, and depth into the intermediate-level application itself. Fundamentals \
are a stepping stone here, not where the effort should concentrate.`,

  advanced: `Scope the plan to a comprehensive, challenging outcome covering the full arc: \
fundamentals through intermediate through advanced, as one combined project. Weight the plan \
heavily toward the advanced end — fundamentals and intermediate stages should be covered briefly \
and efficiently (a small milestone or two, not full treatment), while the majority of milestones, \
tasks, and depth belong in the advanced portion. Advanced is the actual point of choosing this \
level; don't spend equal effort across all three stages — the earlier stages exist only to set up \
the advanced work, not to be developed in their own right. This should be the largest, most \
demanding plan of the three, with its hardest tasks concentrated at the end.`,
};
