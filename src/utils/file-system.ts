const HANDLE_DB_NAME = 'rich-zenn-editor';
const HANDLE_STORE_NAME = 'file-handles';
const LAST_FILE_HANDLE_KEY = 'last-opened-file';

type FileHandlePermission = {
  mode?: 'read' | 'readwrite';
};

type FileHandleWithPermission = FileSystemFileHandle & {
  queryPermission?: (permission?: FileHandlePermission) => Promise<PermissionState>;
  requestPermission?: (permission?: FileHandlePermission) => Promise<PermissionState>;
};

const hasIndexedDb = () => {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
};

const openHandleDatabase = async (): Promise<IDBDatabase | null> => {
  if (!hasIndexedDb()) {
    return null;
  }

  return new Promise((resolve) => {
    const request = window.indexedDB.open(HANDLE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(HANDLE_STORE_NAME)) {
        database.createObjectStore(HANDLE_STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      resolve(null);
    };
  });
};

const waitForTransaction = async (transaction: IDBTransaction) => {
  return new Promise<boolean>((resolve) => {
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => resolve(false);
    transaction.onabort = () => resolve(false);
  });
};

const isFileHandle = (value: unknown): value is FileSystemFileHandle => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'getFile' in value;
};

export const loadRecentFileHandle = async (): Promise<FileSystemFileHandle | null> => {
  const database = await openHandleDatabase();
  if (!database) {
    return null;
  }

  try {
    const transaction = database.transaction(HANDLE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(HANDLE_STORE_NAME);
    const request = store.get(LAST_FILE_HANDLE_KEY);

    const handle = await new Promise<unknown>((resolve) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });

    await waitForTransaction(transaction);
    return isFileHandle(handle) ? handle : null;
  } catch {
    return null;
  } finally {
    database.close();
  }
};

export const saveRecentFileHandle = async (handle: FileSystemFileHandle) => {
  const database = await openHandleDatabase();
  if (!database) {
    return;
  }

  try {
    const transaction = database.transaction(HANDLE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(HANDLE_STORE_NAME);
    store.put(handle, LAST_FILE_HANDLE_KEY);
    await waitForTransaction(transaction);
  } catch {
    // Ignore persistence errors. The editor still works without handle memory.
  } finally {
    database.close();
  }
};

export const clearRecentFileHandle = async () => {
  const database = await openHandleDatabase();
  if (!database) {
    return;
  }

  try {
    const transaction = database.transaction(HANDLE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(HANDLE_STORE_NAME);
    store.delete(LAST_FILE_HANDLE_KEY);
    await waitForTransaction(transaction);
  } catch {
    // ignore
  } finally {
    database.close();
  }
};

export const ensureHandlePermission = async (
  handle: FileSystemFileHandle,
  mode: 'read' | 'readwrite',
  requestIfNeeded: boolean,
) => {
  const permissionHandle = handle as FileHandleWithPermission;

  try {
    if (typeof permissionHandle.queryPermission === 'function') {
      const state = await permissionHandle.queryPermission({ mode });
      if (state === 'granted') {
        return true;
      }

      if (!requestIfNeeded || typeof permissionHandle.requestPermission !== 'function') {
        return false;
      }

      const requestedState = await permissionHandle.requestPermission({ mode });
      return requestedState === 'granted';
    }

    return true;
  } catch {
    return false;
  }
};
