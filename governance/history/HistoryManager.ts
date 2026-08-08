import * as fs from 'fs';
import * as path from 'path';
import { GovernanceTrendSnapshot } from '../../src/features/governance/types';

export class HistoryManager {
  private historyPath: string;

  constructor(outputDir: string) {
    this.historyPath = path.join(outputDir, 'history', 'history.json');
    this.ensureDir(path.dirname(this.historyPath));
  }

  public append(record: GovernanceTrendSnapshot) {
    let history: GovernanceTrendSnapshot[] = [];
    if (fs.existsSync(this.historyPath)) {
      try {
        const data = fs.readFileSync(this.historyPath, 'utf8');
        history = JSON.parse(data);
      } catch (e) {
        console.warn('Failed to parse history.json, starting fresh.');
      }
    }

    history.push(record);
    fs.writeFileSync(this.historyPath, JSON.stringify(history, null, 2));
  }

  private ensureDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}
