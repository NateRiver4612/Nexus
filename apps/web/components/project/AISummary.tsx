import type { KickoffPlanType } from '@nexus/types';
import Overview from '../Overview';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

type AISummaryProps = {
  summary: KickoffPlanType['summary'];
};

function AccordionItemHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex w-full items-start justify-between gap-3 pr-2">
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold text-gray-900">{title}</span>
          {/* {description && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{description}</p>} */}
        </div>
      </div>
    </div>
  );
}

const AISummary = ({ summary }: AISummaryProps) => {
  return (
    <div className=" rounded-lg border border-border bg-white p-4">
      <Overview data={summary?.overview}></Overview>

      {summary.keyTopics.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Key topics
          </h3>

          <Accordion
            type="multiple"
            className="rounded-xl my-3 border border-gray-200 bg-white shadow-sm"
          >
            {summary.keyTopics.map((topic, index) => (
              <AccordionItem
                className="border-b-0"
                key={`${topic.topic}-${index}`}
                value={`topic-${index}`}
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <AccordionItemHeader
                    title={topic.topic}
                    description={topic.description}
                  ></AccordionItemHeader>
                </AccordionTrigger>
                <AccordionContent className="text-sm px-4 pb-3 text-muted-foreground">
                  {topic.description}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {summary.highlights.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Highlights
          </h3>
          <ul className="mt-2 space-y-1">
            {summary.highlights.map((highlight, index) => (
              <li key={`${highlight}-${index}`} className="flex gap-2 text-sm">
                <span className="select-none text-muted-foreground">–</span>
                <span className="text-muted-foreground">{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AISummary;
