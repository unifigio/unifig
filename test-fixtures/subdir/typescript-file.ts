// Import from old package
import { utility } from 'old-package/helpers';

// TypeScript code
interface Config {
  name: string;
  value: number;
}

const config: Config = {
  name: 'test',
  value: 42
};

console.log(config);