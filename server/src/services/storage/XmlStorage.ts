import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { getEnv } from "../../config/env.js";

export function sha256Hex(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export class XmlStorage {
  private root() {
    return path.resolve(getEnv().STORAGE_DIR);
  }

  async saveXml(params: {
    companyId: string;
    eventType: string;
    eventId: string;
    xml: string;
  }): Promise<{ storagePath: string; sha256: string }> {
    const hash = sha256Hex(params.xml);
    const dir = path.join(this.root(), params.companyId, params.eventType);
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, `${params.eventId}-${hash.slice(0, 12)}.xml`);
    await fs.writeFile(file, params.xml, { encoding: "utf8", mode: 0o600 });
    return { storagePath: file, sha256: hash };
  }

  async readXml(storagePath: string): Promise<string> {
    return fs.readFile(storagePath, "utf8");
  }
}

export const xmlStorage = new XmlStorage();
