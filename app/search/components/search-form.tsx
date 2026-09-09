"use client";

import { FormEvent } from "react";

interface SearchFormProps {
  initialSearch: string;
  onSearch: (value: string) => void;
}

export default function SearchForm({
  initialSearch,
  onSearch,
}: SearchFormProps) {
  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const form =
      new FormData(event.currentTarget);

    const value =
      String(
        form.get("search") ?? ""
      ).trim();

    onSearch(value);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-3"
    >
      <input
        name="search"
        defaultValue={initialSearch}
        placeholder="Search research papers..."
        className="min-w-0 flex-1 rounded-lg border px-4 py-3 outline-none focus:ring-2"
      />

      <button
        type="submit"
        className="rounded-lg bg-black px-6 py-3 font-medium text-white hover:opacity-90"
      >
        Search
      </button>
    </form>
  );
}