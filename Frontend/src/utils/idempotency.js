import { v4 as uuid } from "uuid";

/** Freshly minted idempotency key for a transfer submission. */
export const newIdempotencyKey = () => `tx-${uuid()}`;