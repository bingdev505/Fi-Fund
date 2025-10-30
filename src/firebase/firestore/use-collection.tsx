'use client';
import {
  collection,
  onSnapshot,
  Query,
  DocumentData,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

export function useCollection<T>(query: Query<DocumentData> | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setData([]);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const items = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as T)
        );
        setData(items);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
        console.error(`Error fetching collection:`, err);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, isLoading, error };
}
