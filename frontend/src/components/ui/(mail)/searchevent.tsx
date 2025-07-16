import React, { useState } from 'react';
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import {
    CalendarSearch
  } from "lucide-react";

export function SearchEvent({ onSearch, onClear }) {
//   const [searchTerm, setSearchTerm] = useState('');
//   const [searchUser, setSearchUser] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleClear = () => {
    // setSearchTerm('');
    // setSearchUser('');
    setStartDate('');
    setEndDate('');
    onClear();
  };

  const handleSearch = () => {
    // onSearch({ searchTerm, searchUser, startDate, endDate });
    onSearch({startDate, endDate });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline"><CalendarSearch className="h-4 w-4 "/></Button>
      </PopoverTrigger>
      {/* <PopoverContent className="w-80"> */}
      <PopoverContent className="w-80 bg-zinc-900 border border-zinc-700 shadow-lg">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">
              Set Search & filter.
            </h4>
          </div>
          <div className="grid gap-2">

            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="startDate">From-date</Label>
              <Input
                id="startDate"
                type="date"
                placeholder="Start Date"
                className="col-span-2 h-8"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="endDate">End-date</Label>
              <Input
                id="endDate"
                type="date"
                placeholder="End Date"
                className="col-span-2 h-8"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex justify-between items-center gap-4">
              <Button
                onClick={handleSearch}
                className="border-grey w-1/2 h-8"
              >
                Search
              </Button>
              <Button
                onClick={handleClear}
                className="border-grey w-1/2 h-8"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}