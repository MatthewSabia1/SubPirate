import React from 'react';

interface ProgressBarProps {
  progress: number;
  status: string;
  indeterminate?: boolean;
}

function ProgressBar({ progress, status, indeterminate = false }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="h-2 bg-[#111111] rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ease-out ${
            indeterminate 
              ? 'bg-gradient-to-r from-[#2B543A] via-[#4CAF50] to-[#2B543A] bg-[length:200%_100%] animate-gradient'
              : 'bg-[#4CAF50]'
          }`}
          style={{ 
            width: `${indeterminate ? '100' : progress}%`,
          }}
        />
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-400">{status}</span>
        {!indeterminate && (
          <span className="text-[#4CAF50] font-medium">{Math.round(progress)}%</span>
        )}
      </div>
    </div>
  );
}

export default ProgressBar;