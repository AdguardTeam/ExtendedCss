import fs from 'fs-extra';
import path from 'path';

/**
 * Writes `content` to file.
 *
 * @param filePath File path.
 * @param content Content to write.
 */
export const writeFile = async (filePath: string, content: string): Promise<void> => {
    const dirname = path.dirname(filePath);
    await fs.ensureDir(dirname);
    await fs.writeFile(filePath, content);
};
