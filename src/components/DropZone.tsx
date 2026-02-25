interface DropZoneProps {
  isDragging: boolean;
  hasImage: boolean;
  children: React.ReactNode;
  onBrowse: () => void;
}

export function DropZone({ isDragging, hasImage, children, onBrowse }: DropZoneProps) {
  if (hasImage) {
    return <div className="flex-1 flex items-center justify-center">{children}</div>;
  }

  return (
    <div
      className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-colors ${
        isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-400'
      }`}
    >
      <p className="text-gray-400 text-lg mb-2">Drop images here</p>
      <p className="text-gray-500 text-sm">or</p>
      <button
        onClick={onBrowse}
        className="mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
      >
        Browse files
      </button>
    </div>
  );
}
