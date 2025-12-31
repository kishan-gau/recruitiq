/**
 * SearchInput Component - Stub
 */
import React from 'react';
import { Input } from '@recruitiq/ui';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder }) => {
  return (
    <Input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Search..."}
    />
  );
};

export default SearchInput;
