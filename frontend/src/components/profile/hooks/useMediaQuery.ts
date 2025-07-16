import { useEffect, useState } from 'react';

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const documentChangeHandler = () => setMatches(mediaQueryList.matches);

    mediaQueryList.addListener(documentChangeHandler);
    documentChangeHandler();

    return () => {
      mediaQueryList.removeListener(documentChangeHandler);
    };
  }, [query]);

  return matches;
};

export default useMediaQuery;