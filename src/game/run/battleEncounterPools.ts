/** Enemy pools per map column (row 0 → boss). Shared by run map and signal ambushes. */
export const STREET_ENEMY_POOLS: readonly (readonly string[])[] = [
    [ 'basic' ],
    [ 'basic', 'thornward', 'cred-vulture' ],
    [ 'basic', 'thornward', 'broodframe', 'toll-bot', 'drain-host' ],
    [ 'thornward', 'saboteur', 'android', 'wire-thief' ],
    [ 'thornward', 'saboteur', 'gridlock', 'broodframe', 'null-scribe', 'drain-host' ],
    [ 'saboteur', 'smokebinder', 'gridlock', 'android', 'stutter-node', 'vector-haunt', 'drain-host' ],
    [ 'saboteur', 'smokebinder', 'gridlock', 'broodframe', 'phantom-relay', 'bulwark-runner', 'vector-haunt', 'drain-host' ],
    [ 'saboteur', 'smokebinder', 'android', 'cred-vulture', 'chrome-saint' ],
    [ 'smokebinder', 'gridlock', 'twin-clip', 'bulwark-runner', 'chrome-saint', 'vector-haunt' ],
    [ 'smokebinder', 'toll-bot', 'phantom-relay', 'vector-haunt' ],
    [ 'warden' ],
];
