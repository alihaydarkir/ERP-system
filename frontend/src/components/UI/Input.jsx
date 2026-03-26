import React, { useId } from 'react';

export default function Input({ 
  label, 
  error, 
  icon: Icon,
  id,
  className = '', 
  containerClassName = '',
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Icon size={18} />
          </div>
        )}
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`
            block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm 
            focus:border-primary-500 focus:ring-primary-500 
            dark:bg-gray-800 dark:border-gray-700 dark:text-white
            disabled:bg-gray-50 dark:bg-gray-800/50 disabled:text-gray-500 dark:text-gray-400
            transition-colors duration-200
            ${Icon ? 'pl-10' : 'pl-3'}
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
