// `level` v6 ships no type declarations; only the factory signature y-leveldb calls is declared here.
declare module "level" {
  type OpenCallback = (error: Error | null) => void;
  export default function level(
    location: string,
    options: object,
    callback?: OpenCallback,
  ): unknown;
}
