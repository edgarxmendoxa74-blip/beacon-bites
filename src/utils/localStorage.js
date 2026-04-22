/**
 * Safely saves data to localStorage with error handling for QuotaExceededError.
 * If quota is exceeded, it attempts to clear non-essential caches.
 */
export const setLocalData = (key, data) => {
    const APP_KEYS = ['categories', 'menuItems', 'orders', 'paymentSettings', 'orderTypes', 'storeSettings'];
    
    try {
        const serializedData = JSON.stringify(data);
        localStorage.setItem(key, serializedData);
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
            console.warn(`LocalStorage quota exceeded while saving ${key}. Attempting to clear space...`);
            
            // Strategy 1: Clear all other known app caches to make maximum room for this one
            APP_KEYS.forEach(k => {
                if (k !== key) localStorage.removeItem(k);
            });
            
            try {
                localStorage.setItem(key, JSON.stringify(data));
                console.log(`Successfully saved ${key} after clearing other app caches.`);
                return;
            } catch (retryError) {
                // Strategy 2: If it still fails, it means THIS specific key's data is too large (>5MB)
                // We MUST strip it down or give up.
                
                if (key === 'menuItems' && Array.isArray(data)) {
                    console.warn('Attempting to save minimal menuItems (no images, no descriptions) to stays within quota...');
                    // Extremely aggressive stripping: keep only name, price, category, and ID
                    const minimalData = data.map(item => ({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        promo_price: item.promo_price,
                        category_id: item.category_id || item.categoryId,
                        out_of_stock: item.out_of_stock
                        // NO images, NO descriptions, NO variations/addons in the cache
                    }));
                    
                    try {
                        localStorage.setItem(key, JSON.stringify(minimalData));
                        console.log('Saved minimal menuItems to localStorage.');
                        return;
                    } catch (sErr) {
                        console.error('Even minimal menuItems exceeded 5MB. Abandoning local cache.');
                        localStorage.removeItem(key);
                    }
                } else if (key === 'storeSettings') {
                    console.warn('Attempting to save storeSettings without large images...');
                    const minimalSettings = { ...data, banner_images: [], logo_url: '' };
                    try {
                        localStorage.setItem(key, JSON.stringify(minimalSettings));
                        return;
                    } catch (sErr) {
                        localStorage.removeItem(key);
                    }
                } else {
                    console.error(`Failed to save ${key} even after clearing caches. Data is simply too large.`, retryError.message);
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
