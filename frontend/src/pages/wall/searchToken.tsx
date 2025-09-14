
import React, { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuLabel,
//   DropdownMenuRadioGroup,
//   DropdownMenuRadioItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "../../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

interface SearchTokenProps {
  onSearch: (filters: {
    searchTerm: string;
    searchContent: string;
    startDate: string;
    endDate: string;
    type: string;
    encryptionLevel?: string;
  }) => void;
  onClear: () => void;
}

export function SearchToken({ onSearch, onClear }: SearchTokenProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchContent, setSearchContent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState("All");
  const [encryptionLevel, setEncryptionLevel] = useState("All");
  const [address, setAddress] = useState("");

  const handleClear = () => {
    setSearchTerm("");
    setSearchContent("");
    setStartDate("");
    setEndDate("");
    setType("All");
    setEncryptionLevel("All");
    setAddress("");
    onClear();
  };

  const handleSearch = () => {
    onSearch({ 
      searchTerm, 
      searchContent, 
      startDate, 
      endDate, 
      type,
      encryptionLevel,
      address
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="px-3">
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
          <span className="ml-2">Search</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Search & Filter Profiles</h4>
            <p className="text-sm text-gray-500">
              Filter profile inscriptions by various criteria
            </p>
          </div>
          
          <div className="grid gap-3">
            {/* Username Search */}
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Search username..."
                className="col-span-2 h-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Bio Content Search */}
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="bio">Bio</Label>
              <Input
                id="bio"
                type="text"
                placeholder="Search in bio..."
                className="col-span-2 h-8"
                value={searchContent}
                onChange={(e) => setSearchContent(e.target.value)}
              />
            </div>

            {/* Address Search */}
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                type="text"
                placeholder="BSV address..."
                className="col-span-2 h-8"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="startDate">From</Label>
              <Input
                id="startDate"
                type="date"
                className="col-span-2 h-8"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="endDate">To</Label>
              <Input
                id="endDate"
                type="date"
                className="col-span-2 h-8"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Profile Type Filter */}
            <div className="grid grid-cols-3 items-center gap-4">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="col-span-2 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Types</SelectItem>
                  <SelectItem value="Profile">Standard Profile</SelectItem>
                  <SelectItem value="Profile+">Profile+ (with background)</SelectItem>
                  <SelectItem value="BCAT">BCAT Profiles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Encryption Level Filter */}
            <div className="grid grid-cols-3 items-center gap-4">
              <Label>Encryption</Label>
              <Select value={encryptionLevel} onValueChange={setEncryptionLevel}>
                <SelectTrigger className="col-span-2 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Levels</SelectItem>
                  <SelectItem value="0">Public (Unencrypted)</SelectItem>
                  <SelectItem value="1">Level 1 - Subscribers</SelectItem>
                  <SelectItem value="2">Level 2 - Followers</SelectItem>
                  <SelectItem value="3">Level 3 - Friends</SelectItem>
                  <SelectItem value="4">Level 4 - Inner Circle</SelectItem>
                  <SelectItem value="5">Level 5 - Owner Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center gap-2 pt-2">
              <Button 
                onClick={handleClear} 
                variant="outline"
                className="flex-1"
              >
                Clear All
              </Button>
              <Button 
                onClick={handleSearch} 
                className="flex-1"
              >
                Apply Filters
              </Button>
            </div>

            {/* Active Filters Summary */}
            {(searchTerm || searchContent || address || startDate || endDate || type !== 'All' || encryptionLevel !== 'All') && (
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500 mb-1">Active filters:</p>
                <div className="flex flex-wrap gap-1">
                  {searchTerm && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      Username: {searchTerm}
                    </span>
                  )}
                  {searchContent && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      Bio: {searchContent}
                    </span>
                  )}
                  {address && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      Address: {address.substring(0, 8)}...
                    </span>
                  )}
                  {type !== 'All' && (
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                      {type}
                    </span>
                  )}
                  {encryptionLevel !== 'All' && (
                    <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded">
                      Encryption: {encryptionLevel === '0' ? 'None' : `Level ${encryptionLevel}`}
                    </span>
                  )}
                  {(startDate || endDate) && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                      Date range
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}







































// "use client";

// import React, { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuLabel,
//   DropdownMenuRadioGroup,
//   DropdownMenuRadioItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Switch } from "@/components/ui/switch";

// export function SearchToken({ onSearch, onClear, sortOrder, onSortOrderChange }) {
//   const [searchTerm, setSearchTerm] = useState("");
//   const [searchContent, setSearchContent] = useState("");
//   const [startDate, setStartDate] = useState("");
//   const [endDate, setEndDate] = useState("");
//   const [type, setType] = useState("All");

//   const handleClear = () => {
//     setSearchTerm("");
//     setSearchContent("");
//     setStartDate("");
//     setEndDate("");
//     setType("All");
//     onClear();
//   };

//   const handleSearch = () => {
//     onSearch({ searchTerm, searchContent, startDate, endDate, type });
//   };

//   return (
//     <Popover>
//       <PopoverTrigger asChild>
//         <Button variant="outline">⌕</Button>
//       </PopoverTrigger>
//       <PopoverContent className="w-80">
//         <div className="grid gap-4">
//           <div className="space-y-2">
//             <h4 className="font-medium leading-none">Set search & filter</h4>
//           </div>
//           <div className="grid gap-2">
//             <div className="grid grid-cols-3 items-center gap-4">
//               <Label htmlFor="title">Title</Label>
//               <Input
//                 id="title"
//                 type="text"
//                 placeholder="Title..."
//                 className="col-span-2 h-8"
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>
//             <div className="grid grid-cols-3 items-center gap-4">
//               <Label htmlFor="content">Content</Label>
//               <Input
//                 id="content"
//                 type="text"
//                 placeholder="Content..."
//                 className="col-span-2 h-8"
//                 value={searchContent}
//                 onChange={(e) => setSearchContent(e.target.value)}
//               />
//             </div>
//             <div className="grid grid-cols-3 items-center gap-4">
//               <Label htmlFor="startDate">From-date</Label>
//               <Input
//                 id="startDate"
//                 type="date"
//                 placeholder="Start Date"
//                 className="col-span-2 h-8"
//                 value={startDate}
//                 onChange={(e) => setStartDate(e.target.value)}
//               />
//             </div>
//             <div className="grid grid-cols-3 items-center gap-4">
//               <Label htmlFor="endDate">End-date</Label>
//               <Input
//                 id="endDate"
//                 type="date"
//                 placeholder="End Date"
//                 className="col-span-2 h-8"
//                 value={endDate}
//                 onChange={(e) => setEndDate(e.target.value)}
//               />
//             </div>
//             <DropdownMenu>
//               <DropdownMenuTrigger asChild>
//                 <Button variant="outline">{type}</Button>
//               </DropdownMenuTrigger>
//               <DropdownMenuContent className="w-56">
//                 <DropdownMenuLabel>Type</DropdownMenuLabel>
//                 <DropdownMenuSeparator />
//                 <DropdownMenuRadioGroup value={type} onValueChange={setType}>
//                   <DropdownMenuRadioItem value="All">All</DropdownMenuRadioItem>
//                   <DropdownMenuRadioItem value="Snippet">Snippet</DropdownMenuRadioItem>
//                   <DropdownMenuRadioItem value="Article">Article</DropdownMenuRadioItem>
//                 </DropdownMenuRadioGroup>
//               </DropdownMenuContent>
//             </DropdownMenu>
//             <div className="flex justify-between items-center gap-4">
//               <Button onClick={handleSearch} className="border-grey w-1/2 h-8">
//                 Search
//               </Button>
//               <Button onClick={handleClear} className="border-grey w-1/2 h-8">
//                 Clear
//               </Button>
//             </div>
//             {/* <div className="flex items-center gap-2">
//               <Switch
//                 id="sort-order"
//                 checked={sortOrder === 'newest'}
//                 onCheckedChange={(checked) => onSortOrderChange(checked ? 'newest' : 'oldest')}
//               />
//               <Label htmlFor="sort-order">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Label>
//             </div> */}
//           </div>
//         </div>
//       </PopoverContent>
//     </Popover>
//   );
// }

