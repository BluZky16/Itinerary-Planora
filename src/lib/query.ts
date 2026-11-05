import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query';

// Trips you opened stay readable offline for a week. gcTime must be at least as long as the
// persisted maxAge, or restored data is thrown away after the default 5 minutes.
export const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// Bump this when the shape of cached data changes (a new field on Trip or Item), so old saved copies are dropped.
export const CACHE_VERSION = 'v1';

export const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: CACHE_MAX_AGE } } });

// Saves the query cache to AsyncStorage (localStorage on web). Only reads are cached: no offline editing.
export const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: 'itinerary-query-cache' });

// Never save the public share page: a revoked link must not keep opening from a viewer's saved copy.
export const dehydrateOptions = {
  shouldDehydrateQuery: (q: Parameters<typeof defaultShouldDehydrateQuery>[0]) =>
    defaultShouldDehydrateQuery(q) && q.queryKey[0] !== 'share',
};
