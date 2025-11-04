import React from 'react';

interface LoaderProps {
  small?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({ small = false }) => {
  const sizeClasses = small ? 'h-5 w-5' : 'h-8 w-8';
  const borderClasses = small ? 'border-2' : 'border-4';

  return (
    <div
      className={`${sizeClasses} ${borderClasses} border-t-cyan-500 dark:border-t-cyan-400 border-r-cyan-500 dark:border-r-cyan-400 border-b-gray-300 dark:border-b-gray-600 border-l-gray-300 dark:border-l-gray-600 rounded-full animate-spin`}
      role="status"
    >
      <span className="sr-only">Загрузка...</span>
    </div>
  );
};
