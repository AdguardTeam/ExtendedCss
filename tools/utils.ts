import fs from 'fs-extra';
import path from 'path';

/**
 * Writes `content` to file
 * @param filePath
 * @param content
 */
export const writeFile = async (filePath: string, content: string): Promise<void> => {
    const dirname = path.dirname(filePath);
    await fs.ensureDir(dirname);
    await fs.writeFile(filePath, content);
};
