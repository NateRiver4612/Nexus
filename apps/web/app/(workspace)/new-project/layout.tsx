'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

const layout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-12">
      <div className="flex items-center gap-2">
        <p
          onClick={() => router.push('/projects')}
          className="cursor-pointer text-gray-400 font-normal hover:underline"
        >
          Projects
        </p>
        <p>/</p>
        <h1>Create new project</h1>
      </div>

      <div>{children}</div>
    </div>
  );
};

export default layout;
