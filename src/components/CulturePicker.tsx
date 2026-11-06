import React from 'react';
import { useApp } from '../context/AppContext';
import { Culture } from '../types';
import { Globe } from 'lucide-react';

export const CulturePicker: React.FC = () => {
  const { culture, setCulture } = useApp();

  return (
    <div className="relative inline-flex items-center">
      <Globe className="w-4 h-4 text-gray-500 dark:text-zinc-400 absolute left-2.5 pointer-events-none" />
      <select
        value={culture}
        onChange={(e) => setCulture(e.target.value as Culture)}
        className="pl-8 pr-7 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm transition-colors cursor-pointer"
        aria-label="Select Culture"
      >
        <option value="tr-TR">Türkçe (Türkiye)</option>
        <option value="en">English</option>
      </select>
    </div>
  );
};
