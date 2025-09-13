import React from 'react';


const WallT6: React.FC = () => {


    return (

    <div className="container mx-auto p-4">
        <h1>WallT6</h1>
    </div>
  );
};

export default WallT6;


// import React, { useState, useEffect } from 'react';
// import { sheet14DataStore, SheetData } from '@/components/data/Forms/(Buy&Sell)/sheet14';
// import ProfileSell from '@/components/Account/(sheets)/(Profilesell)/profilesell';
// import FormSheetProfile from '@/components/Forms/(Profile)/profilesell';

// import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
// import { Switch } from '@/components/ui/switch';
// import { Label } from '@/components/ui/label';
// import { Search014, SearchParams } from "@/components/item/(formitems)/(Buy&Sell)/search014";
// import Count014 from '@/components/item/(formitems)/(Buy&Sell)/count014';


// const SheetProfile: React.FC = () => {
//     const [data, setData] = useState<SheetData[]>(sheet14DataStore);
//     const [filteredData, setFilteredData] = useState<SheetData[]>(sheet14DataStore);
//     const [currentPage, setCurrentPage] = useState(1);
//     const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
//     const itemsPerPage = 15;

//     const handleReviewAdded = (newReview) => {
//         setData([newReview, ...data]);
//       };
  
//     useEffect(() => {
//       const sortedData = [...filteredData].sort((a, b) => {
//         const dateA = new Date(a.uploadDate);
//         const dateB = new Date(b.uploadDate);
//         return sortOrder === 'newest' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
//       });
//       setFilteredData(sortedData);
//     }, [sortOrder]);
  
//     const handleSortOrderChange = (order: 'newest' | 'oldest') => {
//       setSortOrder(order);
//       setCurrentPage(1);
//     };
 
//   const handleSearch = (searchParams: SearchParams) => {
//     const { name, alertDialogTitle, productType, description, keyInformation } = searchParams;

//     const filtered = data.filter(item => {
//       const matchesName = item.name.toLowerCase().includes(name.toLowerCase());
//       const matchesAlertDialogTitle = item.alertDialogTitle.toLowerCase().includes(alertDialogTitle.toLowerCase());
//       const matchesProductType = item.productType.toLowerCase().includes(productType.toLowerCase());
//       const matchesDescription = item.description.toLowerCase().includes(description.toLowerCase());
//       const matchesKeyInformation = item.keyInformation.toLowerCase().includes(keyInformation.toLowerCase());

//       return (
//         matchesName &&
//         matchesAlertDialogTitle &&
//         matchesProductType &&
//         matchesDescription &&
//         matchesKeyInformation
//       );
//     });

//     setFilteredData(filtered);
//     setCurrentPage(1);
//   };

//   const handleClear = () => {
//     setFilteredData(data);
//     setCurrentPage(1);
//   };

  
//   const indexOfLastItem = currentPage * itemsPerPage;
//   const indexOfFirstItem = indexOfLastItem - itemsPerPage;
//   const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

//   const paginate = (pageNumber: number) => setCurrentPage(pageNumber);



//   return (
//     <div className="container mx-auto p-4">
//               {/* <h2 className="text-xl font-bold mb-4 text-center">Sheet14 Construction</h2> */}
//               <div className="pb-5">
//         <div className="flex justify-between items-center mt-4">
//           <div className="flex items-center space-x-2">
//           <Switch
//                 id="sort-order"
//                 checked={sortOrder === 'newest'}
//                 onCheckedChange={(checked) => handleSortOrderChange(checked ? 'newest' : 'oldest')}
//                 />
//           <Label htmlFor="sort-order">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Label>
//           </div>
          
//           <div className="flex justify-between items-center">
//           <FormSheetProfile onReviewAdded={handleReviewAdded} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2" />
//           </div>

//           <div className="flex items-center space-x-2">
//             <Search014 onSearch={handleSearch} onClear={handleClear} />
//           </div>

//           <div className="flex items-center space-x-2">
//             <span className="font-medium">Items:</span>
//             <Count014 count={filteredData.length} />
//           </div>
//         </div>
//       </div>

//       <div className='grid grid-cols-1 gap-2 
//         xxxxs:grid-cols-1
//         xxxs:grid-cols-2
//         xxs:grid-cols-2
//         xs:grid-cols-2 
//         s:grid-cols-3 
//         sm:grid-cols-3 
//         md:grid-cols-3 
//         lg:grid-cols-4
//         xl:grid-cols-4'>
//         {filteredData.map((item, index) => (
//           <div key={index} className="flex justify-center">
//             <ProfileSell data={item} />
//           </div>
//         ))}
//       </div>

//       <Pagination>
//         <PaginationContent>
//           <PaginationItem>
//             <PaginationPrevious href="#" onClick={() => paginate(currentPage > 1 ? currentPage - 1 : currentPage)} />
//           </PaginationItem>
//           <PaginationItem>
//             <PaginationNext href="#" onClick={() => paginate(currentPage < Math.ceil(filteredData.length / itemsPerPage) ? currentPage + 1 : currentPage)} />
//           </PaginationItem>
//         </PaginationContent>
//       </Pagination>
//     </div>
//   );
// };

// export default SheetProfile;
