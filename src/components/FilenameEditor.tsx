import { useState } from 'react';

interface FilenameEditorProps {
  filename: string;
  onChange: (filename: string) => void;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[,_]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function FilenameEditor({ filename, onChange }: FilenameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(filename);

  const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '';
  const nameWithoutExt = filename.slice(0, filename.length - ext.length);
  const sanitized = sanitizeFilename(nameWithoutExt);
  const hasDirtyName = sanitized !== nameWithoutExt;

  const handleSave = () => {
    onChange(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Filename</label>
        <div className="flex gap-1">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            onBlur={handleSave}
            autoFocus
            className="flex-1 bg-gray-700 text-white text-xs rounded px-2 py-1.5 border border-gray-600"
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">Filename</label>
      <div className="flex items-center gap-2">
        <span
          className="text-xs text-gray-300 truncate cursor-pointer hover:text-white"
          onClick={() => { setValue(filename); setEditing(true); }}
        >
          {filename}
        </span>
        {hasDirtyName && (
          <button
            onClick={() => onChange(sanitized + ext)}
            className="text-[10px] px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded hover:bg-yellow-600/30"
            title="Clean filename"
          >
            Clean
          </button>
        )}
      </div>
    </div>
  );
}
