// Tiny JSON-file store. Good enough for a demo; swap for Postgres in production.
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.OFFLINEPAY_DATA || path.resolve(import.meta.dirname, '..', 'data');

export function createStore(name, initial) {
  const file = path.join(DATA_DIR, `${name}.json`);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  let data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : structuredClone(initial());
  let timer = null;

  const save = () => {
    clearTimeout(timer);
    timer = setTimeout(() => fs.writeFileSync(file, JSON.stringify(data, null, 2)), 50);
  };

  return {
    get data() { return data; },
    save,
    reset(keep = {}) { data = { ...structuredClone(initial()), ...keep }; save(); },
  };
}
