/**
 * What a lesson's code is to a page rendered on the server: nothing. Pages are worked out ahead of
 * time without running any lesson, and `#modules/*` (package.json) leads here for them. Otherwise
 * every lesson's page would send every other lesson's code, and all of 3D and training with it.
 */
throw new Error("A lesson's code was asked for on the server; only the browser runs lessons.");

export {};
