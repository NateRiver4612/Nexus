import { useState } from 'react';

const OVERVIEW_TOGGLE_THRESHOLD = 300;

const Overview = ({
  data,
  showTitle = true,
}: {
  data: string | undefined;
  showTitle?: boolean;
}) => {
  const [isOverviewExpanded, setIsOverviewExpanded] = useState<boolean>(false);

  const shouldShowToggle = data ? data.length > OVERVIEW_TOGGLE_THRESHOLD : false;

  if (!data) {
    return <></>;
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        {showTitle && (
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-foreground">Overview</h2>
          </div>
        )}

        <div
          className={`relative overflow-hidden transition-[max-height] duration-500 ease-in-out 
              ${shouldShowToggle ? (isOverviewExpanded ? 'max-h-250' : 'max-h-24') : 'max-h-none'}`}
        >
          <p className="text-sm leading-6 text-muted-foreground">{data}</p>

          {/* Show more */}
          {shouldShowToggle && !isOverviewExpanded && (
            <div className="absolute cursor-pointer bottom-0.5 right-0 flex items-center bg-card">
              <span className="text-sm text-muted-foreground">...</span>

              <p
                onClick={() => setIsOverviewExpanded(true)}
                className="ml-1 text-sm font-medium text-foreground hover:underline"
              >
                Show more
              </p>
            </div>
          )}

          {/* Show less */}
          {shouldShowToggle && isOverviewExpanded && (
            <button
              type="button"
              onClick={() => setIsOverviewExpanded(false)}
              className="mt-1 text-sm cursor-pointer font-medium text-foreground hover:underline"
            >
              Show less
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Overview;
