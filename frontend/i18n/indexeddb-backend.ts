/**
 * IndexedDB backend for i18next translations
 * Provides persistent client-side caching for translations
 */
export class IndexedDBBackend {
  private static dbName = 'i18n-cache';
  private static storeName = 'translations';
  private static db: IDBDatabase | null = null;
  private static MAX_AGE = 60 * 60 * 1000; // 1 hour

  static async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: ['lng', 'ns'] });
        }
      };
    });
  }

  // Helper function to strip [FR], [DE], [EN] prefixes from translation values
  private static stripPrefixes(obj: any): any {
    if (typeof obj === 'string') {
      return obj.replace(/^\[(FR|DE|EN)\]\s*/i, '').trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(this.stripPrefixes.bind(this));
    }
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.stripPrefixes(value);
      }
      return result;
    }
    return obj;
  }

  static async read(
    lng: string,
    ns: string,
  ): Promise<{ data: any; etag: string; timestamp: number } | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get([lng, ns]);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // Check if cache is stale
        if (Date.now() - result.timestamp > this.MAX_AGE) {
          resolve(null);
          return;
        }

        // Strip prefixes from cached data in case old cache has them
        const cleanedData = this.stripPrefixes(result.data);

        resolve({
          data: cleanedData,
          etag: result.etag || '',
          timestamp: result.timestamp,
        });
      };

      request.onerror = () => reject(request.error);
    });
  }

  static async save(
    lng: string,
    ns: string,
    data: any,
    etag: string | null,
  ): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      store.put({
        lng,
        ns,
        data,
        etag: etag || '',
        timestamp: Date.now(),
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  static async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static isStale(cached: { timestamp: number }): boolean {
    return Date.now() - cached.timestamp > this.MAX_AGE;
  }

  // Force clear all cached translations (useful when translations are updated)
  static async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('IndexedDB translation cache cleared');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
}

