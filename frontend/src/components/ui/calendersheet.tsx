// // 00a6ee   color html
// import React, { useState, useEffect } from 'react';
// import { DateRange, Range } from 'react-date-range';
// import 'react-date-range/dist/styles.css';
// import 'react-date-range/dist/theme/default.css';
// import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
// import 'react-tabs/style/react-tabs.css';
// import calendar1 from './calendar1';
// import calendar2 from './calendar2';
// import { Textarea } from "../../components/ui/textarea";
// import { Button } from "../../components/ui/button";
// // import { Input } from "@/components/ui/input";
// // import { Label } from "@/components/ui/label";

// // import { DataTableDemo } from '@/components/Account/(sheets)/(BuildingOut)/managebooking';   

// // Define calendars
// const calendars = [
//   calendar1,
//   calendar2,
//   // ... Add more calendars if needed
// ];

// const Calendar = () => {
//   const [selectedCalendar, setSelectedCalendar] = useState<number>(0);
//   const [selectedLocation, setSelectedLocation] = useState<string>('');
//   const [locations, setLocations] = useState<string[]>([]);
//   const [viewState, setViewState] = useState<Range[]>([]);
//   const [noOfGuests, setNoOfGuests] = useState(1);
//   const [comment, setComment] = useState<string>('');
//   const [bookingState, setBookingState] = useState<Range[]>([]); // Initially empty to avoid pre-selection
//   const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
//   const [startDate, setStartDate] = useState<Date | null>(null);
//   const [endDate, setEndDate] = useState<Date | null>(null);
//   const [errorMessage, setErrorMessage] = useState<string>('');
//   const [nightsCount, setNightsCount] = useState<number>(0);

//   useEffect(() => {
//     const calendarData = calendars[selectedCalendar];
//     const locationKeys = Object.keys(calendarData);
//     setLocations(locationKeys);
//     if (locationKeys[0]) {
//       setSelectedLocation(locationKeys[0]);
//     }
//   }, [selectedCalendar]);

//   useEffect(() => {
//     if (selectedLocation) {
//       const calendarData = calendars[selectedCalendar][selectedLocation] || [];
//       const mappedData = calendarData.map((item) => ({
//         startDate: new Date(item.start),
//         endDate: new Date(item.end),
//         key: item.type,
//       }));

//       setViewState(mappedData);
//       setBookingState([]); // Ensure no pre-selected date range

//       const unavailableDatesArray = calendarData
//         .filter((item) => item.type === 'unavailable' || item.type === 'booked')
//         .flatMap((item) => {
//           const dates = [];
//           let currentDate = new Date(item.start);
//           while (currentDate <= new Date(item.end)) {
//             dates.push(new Date(currentDate));
//             currentDate.setDate(currentDate.getDate() + 1);
//           }
//           return dates;
//         });

//       setUnavailableDates(unavailableDatesArray);
//     }
//   }, [selectedLocation, selectedCalendar]);

//   const handleCalendarChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
//     setSelectedCalendar(Number(event.target.value));
//   };

//   const handleLocationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
//     setSelectedLocation(event.target.value);
//   };

//   const handleBookingChange = (ranges: { selection?: Range }) => {
//     const selection = ranges.selection;
//     if (selection) {
//       const { startDate, endDate } = selection;
//       if (startDate && endDate) {
//         const isDateUnavailableInRange = () => {
//           let currentDate = new Date(startDate);
//           while (currentDate <= endDate) {
//             if (isDateDisabled(currentDate)) {
//               return true;
//             }
//             currentDate.setDate(currentDate.getDate() + 1);
//           }
//           return false;
//         };

//         if (isDateUnavailableInRange()) {
//           setErrorMessage('Selected dates include unavailable dates. Please choose different dates.');
//         } else {
//           setBookingState([selection]); // Only update state when valid dates are selected
//           setStartDate(startDate);
//           setEndDate(endDate);
//           setNightsCount(Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));
//           setErrorMessage('');
//         }
//       }
//     }
//   };

//   const isDateDisabled = (date: Date) => {
//     return unavailableDates.some(
//       (unavailableDate) => unavailableDate.toDateString() === date.toDateString()
//     );
//   };

//   const getAllDatesInRange = (start: Date, end: Date) => {
//     const dateArray = [];
//     let currentDate = new Date(start);
//     while (currentDate <= end) {
//       dateArray.push(new Date(currentDate));
//       currentDate.setDate(currentDate.getDate() + 1);
//     }
//     return dateArray;
//   };

//   const handleRequest = () => {
//     if (startDate && endDate) {
//       // Get all nights (dates) in the selected range
//       const nights = getAllDatesInRange(startDate, endDate);

//       // Log or send the booking data
//       console.log({
//         nights: nights.map((date) => date.toDateString()),
//         comment,
//         noOfGuests,
//       });

//       alert(
//         `Request submitted for ${nights.length} nights: ${nights.map((date) => date.toDateString()).join(', ')}\n\nNumber of guests: ${noOfGuests}\nComment: ${comment}`
//       );
//     }
//   };

//   const today = new Date();

//   return (
//     <div className="p-4 overflow-y-auto">
//       <Tabs>

//           <DateRange
//             editableDateInputs={true}
//             onChange={handleBookingChange}
//             ranges={bookingState.length > 0 ? bookingState : [{ startDate: null, endDate: null, key: 'selection' }]} // Empty until user selects dates
//             rangeColors={['#00a6ee']}
//             minDate={today}
//             dayContentRenderer={(date) => {
//               const isUnavailable = isDateDisabled(date);
//               const isToday = date.toDateString() === today.toDateString();
//               return (
//                 <div
//                   style={{
//                     textAlign: 'center',
//                     pointerEvents: isUnavailable ? 'none' : 'auto',
//                     opacity: isUnavailable ? 0.7 : 1,
//                     backgroundColor: isUnavailable ? '#ff7043' : 'transparent',
//                     borderRadius: '50%',
//                     color: isUnavailable ? 'white' : 'black',
//                     width: '30px',
//                     height: '30px',
//                     display: 'flex',
//                     justifyContent: 'center',
//                     alignItems: 'center',
//                     borderBottom: isToday ? '2px solid #000' : 'none',
//                   }}
//                 >
//                   {date.getDate()}
//                 </div>
//               );
//             }}
//           />

//           <div className="flex mt-4 flex-col space-y-4">
//           {errorMessage && <div className="text-red-500 mb-4">{errorMessage}</div>}
//           {startDate && endDate && (
//             <div className="flex justify-between items-center mb-4">
//               <div>
//                 <p className="text-underline text-lg font-medium">Dates</p>
//                 <p className="pl-8 text-white-600">Check-in:   {startDate.toDateString()}</p>
//                 <p className="pl-8 text-white-600">Check-out:  {endDate.toDateString()}</p>
//               </div>
//               {/* <a href="#" className="text-sm font-medium text-black underline">Edit</a> */}
//             </div>
//           )}

//           <div className="flex justify-between items-center">
//             {nightsCount > 0 && (
//               <div>
//                 <p className="text-lg font-medium">Nights</p>
//                 <p className="pl-8 text-white-600">{nightsCount} nights</p>
//               </div>
//             )}
//           </div>


//                     {/* Number of guests input and label on the same line */}
//                     <div className="flex items-center space-x-2">
//                 <div className="pl-10 text-underline text-lg font-medium">Number of guests:</div>
//                 <input
//                   value={noOfGuests}
//                   onChange={(e) => setNoOfGuests(parseInt(e.target.value))}
//                   min={1}
//                   type="number"
//                   className="w-12 pl-4 text-lg outline-none text-black"
//                 />
//               </div>
//             </div>


//           <div className="flex mt-4 flex-col space-y-4">
//           <div className="pt-4 text-lg font-medium">Message the host:</div>
//           <div className="text-sm font-medium">Share why you're travelling, who's coming with you and what you love about the space.</div>
//           <Textarea
//               value={comment}
//               onChange={(e) => setComment(e.target.value)}
//               placeholder="Hi! I'll be visiting ..."
//               className="w-full p-2 border rounded text-lg"
//             />


//                   <div className="border border-gray-300 rounded-lg p-6 shadow-sm w-full max-w-md">
//                     {/* Title */}
//                     <h2 className="text-xl font-semibold mb-4">Price details</h2>

//                     {/* Price Items */}
//                     <div className="space-y-3">
//                       {/* Nightly rate */}
//                       <div className="flex justify-between">
//                         <p className="text-gray-600">PRICE x {nightsCount} nights</p>
//                         <p className="text-gray-600">PRICE</p>
//                       </div>

//                       {/* Cleaning fee */}
//                       <div className="flex justify-between">
//                         <p className="text-gray-600">Cleaning fee</p>
//                         <p className="text-gray-600">COST</p>
//                       </div>

//                       {/* Airbnb service fee */}
//                       <div className="flex justify-between">
//                         <p className="text-gray-600">Mono service fee</p>
//                         <p className="text-gray-600">COST</p>
//                       </div>
//                     </div>

//                     {/* Divider */}
//                     <div className="border-t border-gray-300 my-4"></div>

//                     {/* Total */}
//                     <div className="flex justify-between items-center">
//                       <p className="text-lg font-bold">Total</p>
//                       <p className="text-lg font-bold">PRICE</p>
//                     </div>
//                   </div>


//             <Button
//               onClick={handleRequest}
//               disabled={!startDate || !endDate}
//               className={`rounded-full flex-grow bg-white border-gray p-4 ${
//                 startDate && endDate ? 'text-blue-500' : 'text-gray-300'
//               }`}
//             >
//               Request a booking
//             </Button>
//           </div>
//       </Tabs>
//     </div>
//   );
// };

// export default Calendar;







