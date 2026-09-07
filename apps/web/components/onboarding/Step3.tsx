'use client';

import { UploadKnowledgeSource } from '../UploadKnowledgeSource';

export function Step3() {
  const handleOnFilesAdded = (files: File[]) => {
    console.log('Files added:', files);
  };

  const handleOnLinkAdded = (url: string) => {
    console.log('Link added:', url);
  };

  const handleOnTextAdded = (title: string, content: string) => {
    console.log('Text added:', { title, content });
  };

  return (
    <UploadKnowledgeSource
      onFilesAdded={handleOnFilesAdded}
      onLinkAdded={handleOnLinkAdded}
      onTextAdded={handleOnTextAdded}
    />
  );
}
