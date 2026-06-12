/**
 * StorageManager - Premium Browser Storage Strategy Module
 * Acts as a wrapper and monitor for IndexedDB persistence, quotas, and safe write actions.
 * Designed by a Senior Frontend Engineer.
 */

export class BrowserStorageManager {
    constructor(dbName = 'AlertSummarizerDB') {
        this.dbName = dbName;
    }

    /**
     * Requests 'Persistent Storage' (navigator.storage.persist) to prevent the browser
     * from automatically evicting the database under low disk space conditions.
     * @returns {Promise<boolean>} Resolves to true if persistence is granted, false otherwise.
     */
    async requestPersistence() {
        if (!navigator.storage || !navigator.storage.persist) {
            console.warn("[StorageManager] StorageManager API is not supported in this browser. Running with best-effort persistence.");
            return false;
        }

        try {
            // Check if already persisted first
            const isAlreadyPersisted = await navigator.storage.persisted();
            if (isAlreadyPersisted) {
                console.info("[StorageManager] Persistent storage status: ALREADY_GRANTED.");
                return true;
            }

            // Request persistence permission
            const isPersisted = await navigator.storage.persist();
            if (isPersisted) {
                console.log("[StorageManager] Persistent storage request: APPROVED by browser.");
            } else {
                console.warn("[StorageManager] Persistent storage request: DENIED. Browser may evict data under storage pressure.");
            }
            return isPersisted;
        } catch (error) {
            console.error("[StorageManager] Error requesting persistence:", error);
            return false;
        }
    }

    /**
     * Checks if persistent storage is already granted.
     * @returns {Promise<boolean>}
     */
    async isPersisted() {
        if (!navigator.storage || !navigator.storage.persisted) {
            return false;
        }
        try {
            return await navigator.storage.persisted();
        } catch (e) {
            return false;
        }
    }

    /**
     * Monitors disk quota usage using navigator.storage.estimate.
     * @returns {Promise<{supported: boolean, totalQuotaGB: number, usageMB: number, percentUsed: number}>}
     */
    async getQuotaDetails() {
        const fallback = { supported: false, totalQuotaGB: 0, usageMB: 0, percentUsed: 0 };

        if (!navigator.storage || !navigator.storage.estimate) {
            console.warn("[StorageManager] Storage estimate API is not supported in this browser.");
            return fallback;
        }

        try {
            const estimate = await navigator.storage.estimate();
            
            // Convert bytes to higher denominations
            const quotaBytes = estimate.quota || 0;
            const usageBytes = estimate.usage || 0;

            const totalQuotaGB = parseFloat((quotaBytes / (1024 * 1024 * 1024)).toFixed(2));
            const usageMB = parseFloat((usageBytes / (1024 * 1024)).toFixed(2));
            const percentUsed = quotaBytes > 0 ? parseFloat(((usageBytes / quotaBytes) * 100).toFixed(2)) : 0;

            return {
                supported: true,
                totalQuotaGB,
                usageMB,
                percentUsed
            };
        } catch (error) {
            console.error("[StorageManager] Failed to estimate storage quota:", error);
            return fallback;
        }
    }

    /**
     * Safely executes an IndexedDB write transaction (put/add) inside a wrapper
     * that intercepts QuotaExceededError and provides hooks for user notification.
     * 
     * @param {IDBDatabase} db An active IndexedDB database connection.
     * @param {string} storeName The object store to write to.
     * @param {any} item The record to write (must contain the keyPath).
     * @param {Function} [onQuotaExceeded] Optional callback executed when storage fills up.
     * @returns {Promise<boolean>} True if write succeeded, false if failed.
     */
    async safeWrite(db, storeName, item, onQuotaExceeded = null) {
        return new Promise((resolve) => {
            try {
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.put(item);

                request.onsuccess = () => {
                    resolve(true);
                };

                request.onerror = (event) => {
                    const error = event.target.error;
                    
                    // Handle quota exceeded cases
                    if (error.name === 'QuotaExceededError' || error.code === DOMException.QUOTA_EXCEEDED_ERR) {
                        console.error(`[StorageManager] QuotaExceededError: Storage quota reached or hard drive full during write to ${storeName}.`);
                        
                        if (typeof onQuotaExceeded === 'function') {
                            try {
                                onQuotaExceeded(error);
                            } catch (cbErr) {
                                console.error("[StorageManager] Error in onQuotaExceeded callback:", cbErr);
                            }
                        }
                    } else {
                        console.error(`[StorageManager] Database write error on store ${storeName}:`, error);
                    }
                    
                    resolve(false);
                };

                transaction.onerror = (event) => {
                    event.preventDefault(); // Prevent bubbling up and crashing app
                    resolve(false);
                };

            } catch (error) {
                console.error("[StorageManager] Exception caught in safeWrite wrapper:", error);
                resolve(false);
            }
        });
    }
}
