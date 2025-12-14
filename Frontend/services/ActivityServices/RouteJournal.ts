import * as FileSystem from 'expo-file-system';

// Define the shape of a saved point to match your needs
export interface JournalPoint {
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
}

const SESSION_FILE_PATH = `${FileSystem.documentDirectory}current_run_journal.json`;

export class RouteJournal {
  private static instance: RouteJournal;
  private buffer: JournalPoint[] = [];
  private isWriting = false;

  private constructor() {}

  static getInstance(): RouteJournal {
    if (!RouteJournal.instance) {
      RouteJournal.instance = new RouteJournal();
    }
    return RouteJournal.instance;
  }

  /**
   * Clears any previous session data to start fresh.
   */
  async resetJournal() {
    this.buffer = [];
    // Check if old file exists and delete it
    const fileInfo = await FileSystem.getInfoAsync(SESSION_FILE_PATH);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(SESSION_FILE_PATH);
    }
  }

  /**
   * Adds a point to the memory buffer.
   * Logic: We keep points in RAM for speed, but write to disk periodically.
   */
  async addPoint(point: JournalPoint) {
    this.buffer.push(point);

    // OPTIMIZATION: Write to disk every 10 points (approx every 10-15 seconds)
    // or if the buffer gets too large.
    // In a production app, you might use an 'append' strategy, but for Beta, 
    // overwriting the JSON file with the full array is safer and plenty fast for < 2 hours of data.
    if (this.buffer.length % 10 === 0) {
      this.flushToDisk();
    }
  }

  /**
   * Writes the current buffer to the file system.
   * This is async so it doesn't block the UI thread.
   */
  private async flushToDisk() {
    if (this.isWriting) return; // Prevent race conditions
    this.isWriting = true;

    try {
      const json = JSON.stringify(this.buffer);
      await FileSystem.writeAsStringAsync(SESSION_FILE_PATH, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch (error) {
      console.error('[RouteJournal] Failed to write journal:', error);
    } finally {
      this.isWriting = false;
    }
  }

  /**
   * Called when Stop is pressed.
   * Returns the full array of points for the upload service.
   */
  async saveAndFinish(): Promise<JournalPoint[]> {
    // 1. Force a final write to ensure everything is saved
    await this.flushToDisk();
    
    // 2. Return the buffer (which matches the file)
    return [...this.buffer];
  }

  /**
   * Emergency recovery: loads data if the app crashed and restarted
   */
  async recoverSession(): Promise<JournalPoint[] | null> {
    const fileInfo = await FileSystem.getInfoAsync(SESSION_FILE_PATH);
    if (!fileInfo.exists) return null;

    try {
      const content = await FileSystem.readAsStringAsync(SESSION_FILE_PATH);
      const data = JSON.parse(content);
      this.buffer = data; // Restore memory state
      return data;
    } catch (e) {
      console.error('[RouteJournal] Corrupt recovery file');
      return null;
    }
  }
}
