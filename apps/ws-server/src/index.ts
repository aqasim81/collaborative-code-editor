import { main } from "./main";

const result = await main(process.env, process);
if (!result.success) {
  process.stderr.write(`${result.error}\n`);
  process.exit(1);
}
