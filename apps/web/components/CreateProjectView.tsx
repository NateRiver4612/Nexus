'use client';
import { useRouter } from 'next/navigation';

import { Onboarding } from '@/components/onboarding/Onboarding';

const CreateProjectView = () => {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <p onClick={() => router.push('/projects')} className="cursor-pointer hover:underline">
          Projects
        </p>
        <p>/</p>
        <h1 className="font-bold">Create New Project</h1>
      </div>

      <Onboarding />
    </div>
  );
};

export default CreateProjectView;
