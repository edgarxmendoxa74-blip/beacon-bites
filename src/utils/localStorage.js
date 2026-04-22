/**
 * Safely saves data to localStorage with error handling for QuotaExceededError.
 * If quota is exceeded, it attempts to clear non-essential caches.
 */
export const setLocalData = (key, data) => {
    try {
        const serializedData = JSON.stringify(data);
        localStorage.setItem(key, serializedData);
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
            console.warn(`LocalStorage quota exceeded while saving ${key}. Attempting to clear space...`);
            
            // Priority for clearing:
            // 1. Old orders (often the largest growing data)
            // 2. Menu items cache (can be re-fetched)
            
            if (key !== 'orders') {
                localStorage.removeItem('orders');
            }
            
            try {
                localStorage.setItem(key, JSON.stringify(data));
                console.log(`Successfully saved ${key} after clearing space.`);
            } catch (retryError) {
                // If it still fails, and it's not the menuItems we're trying to save, clear menuItems too
                if (key !== 'menuItems') {
                    localStorage.removeItem('menuItems');
                }
                
                try {
                    localStorage.setItem(key, JSON.stringify(data));
                } catch (lastError) {
                    // FINAL FALLBACK: Strip large Base64 images from common large keys
                    if (key === 'menuItems' && Array.isArray(data)) {
                        console.warn('Attempting to save menuItems without images to stay within quota...');
                        const strippedData = data.map(item => ({ 
                            ...item, 
                            image: (item.image && item.image.length > 5000) ? '' : item.image 
                        }));
                        try {
                            localStorage.setItem(key, JSON.stringify(strippedData));
                            return;
                        } catch (sErr) {}
                    }
                    
                    if (key === 'storeSettings' && data) {
                        console.warn('Attempting to save storeSettings without banner images to stay within quota...');
                        const strippedData = { ...data, banner_images: [] };
                        try {
                            localStorage.setItem(key, JSON.stringify(strippedData));
                            return;
                        } catch (sErr) {}
                    }

                    console.error(`Failed to save ${key} even after clearing caches. Data may be too large.`, lastError.message);
                }
            }
        } else {
            console.error(`Error saving ${key} to localStorage:`, e.message);
        }
    }
};

/**
 * Safely retrieves and parses data from localStorage.
 */
export const getLocalData = (key, fallback) => {
    try {
        const saved = localStorage.getItem(key);
        if (!saved) return fallback;
        
        const parsed = JSON.parse(saved);
        
        // Validation: if it's an empty array but we expected data, return fallback
        if (Array.isArray(parsed) && parsed.length === 0 && Array.isArray(fallback) && fallback.length > 0) {
            return fallback;
        }
        
        return parsed || fallback;
    } catch (e) {
        console.error(`Error reading ${key} from localStorage:`, e.message);
        return fallback;
    }
};
