// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

// Lazy load pages for better performance
const HomePage = React.lazy(() => import('./pages/ProfilePage'));
const ExplorePage = React.lazy(() => import('./pages/ContactsPage'));
// const ContentPage = React.lazy(() => import('./pages/ContentsPage'));
const WalletPage = React.lazy(() => import('./pages/WalletPage'));
const MessagesPage = React.lazy(() => import('./pages/MessagesPage'));

// Loading component
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
  </div>
);

const App: React.FC = () => {
  // Load Inter font
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={
            <React.Suspense fallback={<PageLoader />}>
              <HomePage />
            </React.Suspense>
          } />
          <Route path="explore" element={
            <React.Suspense fallback={<PageLoader />}>
              <ExplorePage />
            </React.Suspense>
          } />
          <Route path="wallet" element={
            <React.Suspense fallback={<PageLoader />}>
              <WalletPage />
            </React.Suspense>
          } />
          <Route path="messages" element={
            <React.Suspense fallback={<PageLoader />}>
              <MessagesPage />
            </React.Suspense>
          } />
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;

// // src/App.tsx
// import React, { useEffect } from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import Layout from './components/Layout';

// // Lazy load pages for better performance
// const HomePage = React.lazy(() => import('./pages/ProfilePage'));
// const ExplorePage = React.lazy(() => import('./pages/ContactsPage'));
// // const ContentPage = React.lazy(() => import('./pages/ContentsPage'));
// const WalletPage = React.lazy(() => import('./pages/WalletPage'));
// const MessagesPage = React.lazy(() => import('./pages/MessagesPage'));

// // Loading component
// const PageLoader: React.FC = () => (
//   <div className="flex items-center justify-center h-64">
//     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500">PageLoader</div>
//   </div>
// );

// const App: React.FC = () => {
//   // Load Inter font
//   useEffect(() => {
//     const link = document.createElement('link');
//     link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
//     link.rel = 'stylesheet';
//     document.head.appendChild(link);
//   }, []);

//   return (
//     <Router>
//       <Routes>
//         <Route path="/" element={<Layout />}>
//           <Route index element={
//             <React.Suspense fallback={<PageLoader />}>
//               <HomePage />
//             </React.Suspense>
//           } />
//           <Route path="explore" element={
//             <React.Suspense fallback={<PageLoader />}>
//               <ExplorePage />
//             </React.Suspense>
//           } />

//           <Route path="Wallet" element={
//             <React.Suspense fallback={<PageLoader />}>
//               <WalletPage />
//             </React.Suspense>
//           } />
//           <Route path="messages" element={
//             <React.Suspense fallback={<PageLoader />}>
//               <MessagesPage />
//             </React.Suspense>
//           } />
//           {/* Catch all route */}
//           <Route path="*" element={<Navigate to="/" replace />} />
//         </Route>
//       </Routes>
//     </Router>
//   );
// };

// export default App;