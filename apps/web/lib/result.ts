// The Result pattern for business logic and Server Actions. Import-free, so client code can use it.

export type Result<T> = { success: true; data: T } | { success: false; error: string };

export const NOT_SIGNED_IN = "Not signed in";
