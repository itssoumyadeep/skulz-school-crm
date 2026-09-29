"use client";

import { useState } from "react";

type SearchBarProps = {
  initialValue: string;
  onSearch: (value: string) => void;
};

export default function SearchBar({ initialValue, onSearch }: SearchBarProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim());
      }}
    >
      <label className="flex flex-col gap-1 text-sm text-slate-600">
        <span>Search</span>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Name or student #"
          className="w-64 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500"
        />
      </label>
      <button
        type="submit"
        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
      >
        Search
      </button>
    </form>
  );
}
