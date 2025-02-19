import React from 'react';

interface ProgressBarProps {
  progress: number;
  status: string;
  indeterminate?: boolean;
}

function ProgressBar({ progress, status, indeterminate = false }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="h-1 bg-[#111111] rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ease-out ${
            indeterminate 
              ? 'bg-gradient-to-r from-[#C69B7B] via-[#E6B17E] to-[#C69B7B] bg-[length:200%_100%] animate-gradient'
              : 'bg-[#C69B7B]'
          }`}
          style={{ 
            width: `${indeterminate ? '100' : progress}%`,
          }}
        />
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-400">{status}</span>
        {!indeterminate && (
          <span className="text-[#C69B7B] font-medium">{Math.round(progress)}%</span>
        )}
      </div>
    </div>
  );
}

export default ProgressBar;