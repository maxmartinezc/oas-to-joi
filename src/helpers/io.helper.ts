import fs from "fs";
import { OasToJoiError } from "../errors";

export class IOHelper {
  static async writeFile(options: {
    fileName: string;
    content: string;
    targetDirectory: string;
  }): Promise<void> {
    try {
      await fs.promises.writeFile(
        `${options.targetDirectory}/${options.fileName}`,
        options.content,
      );
    } catch (error) {
      throw new OasToJoiError(error.message);
    }
  }

  static createFolder(name: string): void {
    try {
      if (!fs.existsSync(name)) {
        fs.mkdirSync(name, { recursive: true });
      }
    } catch (error) {
      throw new OasToJoiError(error.message);
    }
  }
}
