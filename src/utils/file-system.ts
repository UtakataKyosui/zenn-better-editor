const HANDLE_DB_NAME = 'rich-zenn-editor';
const HANDLE_STORE_NAME = 'file-handles';
const LAST_FILE_HANDLE_KEY = 'last-opened-file';
const LAST_DIR_HANDLE_KEY = 'last-opened-directory';

type FileHandlePermission = {
  mode?: 'read' | 'readwrite';
};

type FileHandleWithPermission = FileSystemFileHandle & {
  queryPermission?: (
    permission?: FileHandlePermission,
  ) => Promise<PermissionState>;
  requestPermission?: (
    permission?: FileHandlePermission,
  ) => Promise<PermissionState>;
};

const hasIndexedDb = () => {
  return (
    typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
  );
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

export const loadRecentFileHandle =
  async (): Promise<FileSystemFileHandle | null> => {
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

      if (
        !requestIfNeeded ||
        typeof permissionHandle.requestPermission !== 'function'
      ) {
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

// ── Directory Handle utilities ──

const isDirectoryHandle = (
  value: unknown,
): value is FileSystemDirectoryHandle => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'entries' in value && 'kind' in value;
};

export const openArticlesDirectory =
  async (): Promise<FileSystemDirectoryHandle | null> => {
    if (typeof window.showDirectoryPicker !== 'function') {
      return null;
    }

    try {
      return await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch {
      // user cancelled
      return null;
    }
  };

export const listMarkdownFiles = async (
  dirHandle: FileSystemDirectoryHandle,
): Promise<string[]> => {
  const files: string[] = [];

  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'file' && name.endsWith('.md')) {
      files.push(name);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
};

export const readFileFromDirectory = async (
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
): Promise<string | null> => {
  try {
    const fileHandle = await dirHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch {
    return null;
  }
};

export const saveFileToDirectory = async (
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  content: string,
): Promise<boolean> => {
  try {
    const fileHandle = await dirHandle.getFileHandle(fileName, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  } catch {
    return false;
  }
};

export const saveRecentDirectoryHandle = async (
  handle: FileSystemDirectoryHandle,
) => {
  const database = await openHandleDatabase();
  if (!database) {
    return;
  }

  try {
    const transaction = database.transaction(HANDLE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(HANDLE_STORE_NAME);
    store.put(handle, LAST_DIR_HANDLE_KEY);
    await waitForTransaction(transaction);
  } catch {
    // ignore
  } finally {
    database.close();
  }
};

export const loadRecentDirectoryHandle =
  async (): Promise<FileSystemDirectoryHandle | null> => {
    const database = await openHandleDatabase();
    if (!database) {
      return null;
    }

    try {
      const transaction = database.transaction(HANDLE_STORE_NAME, 'readonly');
      const store = transaction.objectStore(HANDLE_STORE_NAME);
      const request = store.get(LAST_DIR_HANDLE_KEY);

      const handle = await new Promise<unknown>((resolve) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });

      await waitForTransaction(transaction);
      return isDirectoryHandle(handle) ? handle : null;
    } catch {
      return null;
    } finally {
      database.close();
    }
  };

export const clearRecentDirectoryHandle = async () => {
  const database = await openHandleDatabase();
  if (!database) {
    return;
  }

  try {
    const transaction = database.transaction(HANDLE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(HANDLE_STORE_NAME);
    store.delete(LAST_DIR_HANDLE_KEY);
    await waitForTransaction(transaction);
  } catch {
    // ignore
  } finally {
    database.close();
  }
};

export const deleteFileFromDirectory = async (
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
): Promise<boolean> => {
  try {
    await dirHandle.removeEntry(fileName);
    return true;
  } catch (error) {
    console.error('Failed to delete file:', error);
    return false;
  }
};
