/**
 * Name of the root Y.Text every client binds its editor to. The WS server only relays cursors that point
 * into it: a position naming any other root type makes every receiver create that type.
 */
export const SHARED_TEXT_NAME = "codemirror";
