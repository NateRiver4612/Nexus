import type { ReactNode } from 'react';

const layout = ({ children }: { children: ReactNode }) => {
  return <div className="flex h-full min-h-0 flex-col">{children}</div>;
};

export default layout;
