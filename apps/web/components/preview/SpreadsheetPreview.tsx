'use client';

import { useEffect, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';

const MAX_ROWS = 200;

type ParsedSheet = {
  name: string;
  rows: string[][];
  truncated: boolean;
};

type SpreadsheetPreviewProps = {
  buffer: ArrayBuffer;
};

export const SpreadsheetPreview = ({ buffer }: SpreadsheetPreviewProps) => {
  const [sheets, setSheets] = useState<ParsedSheet[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSheets(null);
    setError(false);

    const parse = async () => {
      try {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(buffer, { type: 'array' });

        const parsed = workbook.SheetNames.map((name): ParsedSheet => {
          const sheet = workbook.Sheets[name];
          const raw = sheet
            ? (XLSX.utils.sheet_to_json(sheet, {
                header: 1,
                blankrows: false,
                defval: '',
              }) as unknown[][])
            : [];
          const rows = raw.slice(0, MAX_ROWS).map((row) => row.map((cell) => String(cell ?? '')));

          return { name, rows, truncated: raw.length > MAX_ROWS };
        });

        if (!cancelled) setSheets(parsed);
      } catch {
        if (!cancelled) setError(true);
      }
    };

    void parse();

    return () => {
      cancelled = true;
    };
  }, [buffer]);

  if (error) {
    return (
      <p className="text-sm text-error">
        This spreadsheet could not be previewed. Try downloading it.
      </p>
    );
  }

  if (sheets === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sheets.map((sheet) => (
        <section key={sheet.name} className="space-y-2">
          <h3 className="text-sm font-semibold">{sheet.name}</h3>

          {sheet.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Empty sheet.</p>
          ) : (
            <div className="max-h-[70vh] overflow-auto rounded-lg border border-border">
              <table className="min-w-full border-collapse text-xs">
                <tbody>
                  {sheet.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="even:bg-muted/40">
                      {row.map((cell, cellIndex) =>
                        rowIndex === 0 ? (
                          <th
                            key={cellIndex}
                            className="sticky top-0 border border-border bg-muted px-2 py-1 text-left font-semibold whitespace-nowrap"
                          >
                            {cell}
                          </th>
                        ) : (
                          <td
                            key={cellIndex}
                            className="border border-border px-2 py-1 whitespace-nowrap"
                          >
                            {cell}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sheet.truncated && (
            <p className="text-xs text-muted-foreground">Showing the first {MAX_ROWS} rows.</p>
          )}
        </section>
      ))}
    </div>
  );
};
