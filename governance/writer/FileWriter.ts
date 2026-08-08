import * as fs from 'fs';
import * as path from 'path';

export class FileWriter {
  public static write(filePath: string, content: string) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf8');
  }

  public static writeJson(filePath: string, data: any) {
    this.write(filePath, JSON.stringify(data, null, 2));
  }
}
