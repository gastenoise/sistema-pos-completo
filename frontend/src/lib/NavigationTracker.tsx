import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { useAuth } from './AuthContext';
import { pagesConfig } from '@/pages.config';
import { useBusiness } from '@/components/pos/BusinessContext';

const EXCLUDED_NAVIGATION_PAGES = new Set(['BusinessSelect']);

export default function NavigationTracker() {
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    const { businessId } = useBusiness();
    const { Pages, mainPage } = pagesConfig;
    const mainPageKey = mainPage ?? Object.keys(Pages)[0];

    // Log user activity when navigating to a page
    useEffect(() => {
        // Extract page name from pathname
        const pathname = location.pathname;
        let pageName;

        if (pathname === '/' || pathname === '') {
            pageName = mainPageKey;
        } else {
            // Remove leading slash and get the first segment
            const pathSegment = pathname.replace(/^\//, '').split('/')[0];

            // Try case-insensitive lookup in Pages config
            const pageKeys = Object.keys(Pages);
            const matchedKey = pageKeys.find(
                key => key.toLowerCase() === pathSegment.toLowerCase()
            );

            pageName = matchedKey || null;
        }

        const isExcludedPage = pageName ? EXCLUDED_NAVIGATION_PAGES.has(pageName) : false;

        if (isAuthenticated && pageName && businessId && !isExcludedPage) {
            apiClient.post('/protected/navigation-events', {
                path: pathname,
                screen: pageName,
                metadata: {
                    search: location.search,
                    hash: location.hash
                }
            }).catch(() => {
                // Silently fail - logging shouldn't break the app
            });
        }
    }, [location, isAuthenticated, businessId, Pages, mainPageKey]);

    return null;
}
