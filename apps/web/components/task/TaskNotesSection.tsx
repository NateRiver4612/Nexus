import React from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import type { TaskNoteType } from '@nexus/types';

export interface TaskNotesProps {
  notes?: TaskNoteType[];
  onAddNote?: () => void;
  onNoteClick?: (note: TaskNoteType) => void;
  onDeleteNote?: (note: TaskNoteType) => void;
}

interface NoteCardProps {
  note: TaskNoteType;
  onClick?: () => void;
  onDelete?: (note: TaskNoteType) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onClick, onDelete }) => {
  return (
    <div
      onClick={onClick}
      className={`group relative w-57 flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 cursor-pointer min-h-40 bg-[#FAF9F6]/80 border-gray-200/90 text-gray-800 hover:border-gray-300 hover:shadow-sm`}
    >
      <div className="space-y-2.5">
        {/* Title row */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-[15px] text-gray-900 leading-snug tracking-tight">
            {note.title}
          </h3>
          <div className="flex transition opacity-0 group-hover:opacity-100 items-center">
            <div
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="text-gray-300 transition hover:bg-gray-300 p-2 rounded-full hover:text-gray-900 cursor-pointer"
            >
              <Edit size={18}></Edit>
            </div>
            <div
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(note);
              }}
              className="text-gray-300 p-2 rounded-full transition hover:bg-gray-300 hover:text-gray-900 cursor-pointer"
            >
              <Trash2 size={18}></Trash2>
            </div>
          </div>
        </div>

        {/* Content text preview */}
        {note.contentText && (
          <p className={`text-sm line-clamp-3 text-gray-400`}>
            {note.contentText.split('\n').splice(1).join('\n')}
          </p>
        )}
      </div>

      {/* Card footer timestamp */}
      <div className="mt-4 pt-1">
        <span className={`text-xs text-gray-400 font-normal `}>
          Edited {formatDistanceToNowStrict(new Date(note.updatedAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
};

interface AddNoteCardProps {
  onClick?: () => void;
}

const AddNoteCard: React.FC<AddNoteCardProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      type="button"
      className="flex w-57 h-40 flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 transition-all duration-200 text-gray-500 hover:text-gray-700 group focus:outline-none focus:ring-2 focus:ring-gray-200"
    >
      <Plus className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-colors mb-1.5 stroke-[1.75]" />
      <span className="text-[13.5px] font-medium text-gray-500 group-hover:text-gray-700 transition-colors">
        Add a note
      </span>
    </button>
  );
};

export default function TaskNotesSection({
  notes,
  onAddNote,
  onNoteClick,
  onDeleteNote,
}: TaskNotesProps) {
  return (
    <div className=" bg-white flex items-center justify-center p-6 rounded-xl font-sans">
      <div className="w-full space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <h2 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Notes</h2>
          <button
            onClick={onAddNote}
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-200/90 text-[13px] font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4 text-gray-600 stroke-[2]" />
            <span>New note</span>
          </button>
        </div>

        {/* Grid Section */}
        <div className="flex flex-wrap gap-4">
          {notes?.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onClick={() => onNoteClick?.(note)}
              onDelete={() => onDeleteNote?.(note)}
            />
          ))}

          {/* Add a note button card */}
          <AddNoteCard onClick={onAddNote} />
        </div>
      </div>
    </div>
  );
}
