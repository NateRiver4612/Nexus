const Overview = ({
  data,
  showTitle = true,
}: {
  data: string | undefined;
  showTitle?: boolean;
}) => {
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

        <p className="text-sm leading-6 text-muted-foreground">{data}</p>
      </div>
    </div>
  );
};

export default Overview;
