/**
 * Offline Storage Service
 * Manages IndexedDB for offline data persistence
 * 
 * Features:
 * - Store payslips for offline viewing
 * - Cache schedule data
 * - Queue offline actions for sync when online
 * 
 * From PWA Proposal Phase 3: Offline Functionality
 */

const DB_NAME = 'RecruitIQ_OfflineDB';
const DB_VERSION = 1;

// Store names
const STORES = {
  PAYSLIPS: 'payslips',
  SCHEDULES: 'schedules',
  OFFLINE_QUEUE: 'offlineQueue',
};

/**
 * Initialize IndexedDB
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create payslips store
      if (!db.objectStoreNames.contains(STORES.PAYSLIPS)) {
        const payslipsStore = db.createObjectStore(STORES.PAYSLIPS, { 
          keyPath: 'id' 
        });
        payslipsStore.createIndex('date', 'date', { unique: false });
        payslipsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create schedules store
      if (!db.objectStoreNames.contains(STORES.SCHEDULES)) {
        const schedulesStore = db.createObjectStore(STORES.SCHEDULES, { 
          keyPath: 'id' 
        });
        schedulesStore.createIndex('date', 'date', { unique: false });
        schedulesStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create offline queue store
      if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.OFFLINE_QUEUE, { 
          keyPath: 'id',
          autoIncrement: true
        });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        queueStore.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

/**
 * Generic function to add/update data in a store
 */
async function putData<T>(storeName: string, data: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic function to get data from a store
 */
async function getData<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic function to get all data from a store
 */
async function getAllData<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic function to delete data from a store
 */
async function deleteData(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Payslip Storage
 */
export interface StoredPayslip {
  id: string;
  date: string;
  period: string;
  grossAmount: number;
  netAmount: number;
  pdfData?: string; // Base64 encoded PDF
  timestamp: number;
}

export const payslipStorage = {
  /**
   * Save payslip for offline viewing
   * Keeps only the last 3 months
   */
  async savePayslip(payslip: StoredPayslip): Promise<void> {
    const payslipWithTimestamp = {
      ...payslip,
      timestamp: Date.now(),
    };
    
    await putData(STORES.PAYSLIPS, payslipWithTimestamp);
    
    // Clean up old payslips (keep last 3 months)
    await this.cleanupOldPayslips();
  },

  /**
   * Get payslip by ID
   */
  async getPayslip(id: string): Promise<StoredPayslip | undefined> {
    return getData<StoredPayslip>(STORES.PAYSLIPS, id);
  },

  /**
   * Get all stored payslips
   */
  async getAllPayslips(): Promise<StoredPayslip[]> {
    return getAllData<StoredPayslip>(STORES.PAYSLIPS);
  },

  /**
   * Clean up payslips older than 3 months
   */
  async cleanupOldPayslips(): Promise<void> {
    const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    const allPayslips = await this.getAllPayslips();
    
    for (const payslip of allPayslips) {
      if (payslip.timestamp < threeMonthsAgo) {
        await deleteData(STORES.PAYSLIPS, payslip.id);
      }
    }
  },
};

/**
 * Schedule Storage
 */
export interface StoredSchedule {
  id: string;
  date: string;
  shifts: Array<{
    startTime: string;
    endTime: string;
    location: string;
    role: string;
  }>;
  timestamp: number;
}

export const scheduleStorage = {
  /**
   * Save schedule for offline viewing
   */
  async saveSchedule(schedule: StoredSchedule): Promise<void> {
    const scheduleWithTimestamp = {
      ...schedule,
      timestamp: Date.now(),
    };
    
    await putData(STORES.SCHEDULES, scheduleWithTimestamp);
  },

  /**
   * Get schedule by date
   */
  async getSchedule(date: string): Promise<StoredSchedule | undefined> {
    return getData<StoredSchedule>(STORES.SCHEDULES, date);
  },

  /**
   * Get all stored schedules
   */
  async getAllSchedules(): Promise<StoredSchedule[]> {
    return getAllData<StoredSchedule>(STORES.SCHEDULES);
  },

  /**
   * Clean up schedules older than 30 days
   */
  async cleanupOldSchedules(): Promise<void> {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const allSchedules = await this.getAllSchedules();
    
    for (const schedule of allSchedules) {
      if (schedule.timestamp < thirtyDaysAgo) {
        await deleteData(STORES.SCHEDULES, schedule.id);
      }
    }
  },
};

/**
 * Offline Queue
 * Stores actions taken while offline for later sync
 */
export interface QueuedAction {
  id?: number;
  type: 'clock-in' | 'clock-out' | 'time-off-request' | 'profile-update';
  data: any;
  timestamp: number;
  retries: number;
}

export const offlineQueue = {
  /**
   * Add action to offline queue
   */
  async enqueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    const queuedAction: Omit<QueuedAction, 'id'> = {
      ...action,
      timestamp: Date.now(),
      retries: 0,
    };
    
    await putData(STORES.OFFLINE_QUEUE, queuedAction);
  },

  /**
   * Get all queued actions
   */
  async getAll(): Promise<QueuedAction[]> {
    return getAllData<QueuedAction>(STORES.OFFLINE_QUEUE);
  },

  /**
   * Remove action from queue after successful sync
   */
  async dequeue(id: number): Promise<void> {
    await deleteData(STORES.OFFLINE_QUEUE, id);
  },

  /**
   * Update retry count for failed action
   */
  async updateRetries(action: QueuedAction): Promise<void> {
    const updatedAction = {
      ...action,
      retries: action.retries + 1,
    };
    await putData(STORES.OFFLINE_QUEUE, updatedAction);
  },

  /**
   * Process offline queue when back online
   */
  async processQueue(
    processor: (action: QueuedAction) => Promise<void>
  ): Promise<{ success: number; failed: number }> {
    const actions = await this.getAll();
    let success = 0;
    let failed = 0;

    for (const action of actions) {
      try {
        await processor(action);
        await this.dequeue(action.id!);
        success++;
      } catch (error) {
        console.error('Failed to process queued action:', error);
        
        // Remove after 3 failed attempts
        if (action.retries >= 2) {
          await this.dequeue(action.id!);
          failed++;
        } else {
          await this.updateRetries(action);
        }
      }
    }

    return { success, failed };
  },
};

/**
 * Check if browser supports IndexedDB
 */
export function isIndexedDBSupported(): boolean {
  return 'indexedDB' in window;
}

/**
 * Get storage usage information
 */
export async function getStorageInfo(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
} | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentage: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0,
    };
  }
  return null;
}
