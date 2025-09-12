
import React, { useState, useEffect } from 'react';
// import { sheet1DataStore } from '@/components/data/Forms/(Accommadation)/sheet1';
// import Sheet1 from '@/components/Account/(sheets)/(Accommadation)/sheet1';
// import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '../../../components/ui/pagination';
import { Switch } from '../../../components/ui/switch';
// import { Label } from '@/components/ui/label';
import { Label } from "../../../components/ui/label";
        // import Count001 from '@/components/item/(wallt2items)/Count001';
// import { SearchRating } from "@/components/item/(wallt2items)/searchrating";
        // import { SearchRating } from "@/components/item/(wallt2items)/searchrating";
// import Count001 from '@/components/item/(formitems)/(Accommadation)/count001';
        // import { FormSheet1 } from '@/components/item/(wallt2items)/FormSheet1';
// import FormSheet1 from '@/components/Forms/(Accommadation)/sheet1';

const Sheet001: React.FC = () => {
  const [data, setData] = useState(sheet1DataStore);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('newest');
//  const [filteredData, setFilteredData] = useState(sheet1DataStore);
  const itemsPerPage = 15;

  const handleReviewAdded = (newReview) => {
    setData([newReview, ...data]);
  };

  useEffect(() => { 
    const sortedData = [...filteredData].sort((a, b) => {
      const dateA = new Date(a.uploadDate);
      const dateB = new Date(b.uploadDate);
      return sortOrder === 'newest' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    });
    setFilteredData(sortedData);
  }, [sortOrder]);

  const handleSortOrderChange = (order: string) => {
    setSortOrder(order);
    setCurrentPage(1);
  };

  const handleSearch = ({ searchTerm, searchUser, startDate, endDate }) => {
    const filtered = data.filter(item => {
      const matchesTitle = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesContent = item.content.toLowerCase().includes(searchUser.toLowerCase());
      const matchesDate = (!startDate || new Date(item.date) >= new Date(startDate)) &&
                          (!endDate || new Date(item.date) <= new Date(endDate));
      return matchesTitle && matchesContent && matchesDate;
    });
    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const handleClear = () => {
    setFilteredData(data);
    setCurrentPage(1);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className='container mx-auto p-4'>
      <div className="pb-5">
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-2">
              <Switch
                id="sort-order"
                checked={sortOrder === 'newest'}
                onCheckedChange={(checked) => handleSortOrderChange(checked ? 'newest' : 'oldest')}
                />
                <Label htmlFor="sort-order">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Label>
          </div>
          
          <div className="flex justify-between items-center">
            {/* <FormSheet1 onReviewAdded={handleReviewAdded} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2" /> */}
          </div>

          <div className="flex items-center space-x-2">
            {/* <SearchRating onSearch={handleSearch} onClear={handleClear} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2" /> */}
          </div>

          <div className="flex items-center space-x-2">
            {/* <p className="pr-1">Items:</p>
            <Count001 /> */}
          </div>
        </div>
      </div>
      <div className='grid grid-cols-1 gap-2 
        xxxxs:grid-cols-1
        xxxs:grid-cols-2
        xxs:grid-cols-2
        xs:grid-cols-2 
        s:grid-cols-3 
        sm:grid-cols-3 
        md:grid-cols-3 
        lg:grid-cols-4
        xl:grid-cols-4'>
        {currentItems.map((data, index) => (
          <div key={index} className='flex justify-center'>
            {/* <Sheet1 data={data} /> */}
          </div>
        ))}
      </div>
      {/* <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" onClick={() => paginate(currentPage > 1 ? currentPage - 1 : currentPage)} />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" onClick={() => paginate(currentPage < Math.ceil(filteredData.length / itemsPerPage) ? currentPage + 1 : currentPage)} />
          </PaginationItem>
        </PaginationContent>
      </Pagination> */}
    </div>
  );
};

export default Sheet001;



