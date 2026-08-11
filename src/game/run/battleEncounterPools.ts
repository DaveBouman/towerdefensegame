/** Enemy pools per map column (row 0 → boss). Shared by run map and signal ambushes. */
export const STREET_ENEMY_POOLS: readonly (readonly string[])[] = [
    [ 'basic' ],
    [ 'basic', 'thornward', 'cred-vulture' ],
    [ 'basic', 'thornward', 'broodframe', 'toll-bot' ],
    [ 'thornward', 'saboteur', 'android', 'wire-thief' ],
    [ 'thornward', 'saboteur', 'gridlock', 'broodframe', 'null-scribe' ],
    [ 'saboteur', 'smokebinder', 'gridlock', 'android', 'stutter-node' ],
    [ 'saboteur', 'smokebinder', 'gridlock', 'broodframe', 'phantom-relay', 'bulwark-runner' ],
    [ 'saboteur', 'smokebinder', 'android', 'cred-vulture', 'chrome-saint' ],
    [ 'smokebinder', 'gridlock', 'twin-clip', 'bulwark-runner', 'chrome-saint' ],
    [ 'smokebinder', 'toll-bot', 'phantom-relay' ],
    [ 'warden' ],
];
