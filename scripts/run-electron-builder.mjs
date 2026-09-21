/**
 * electron-builder wrapper.
 *
 * electron-builder 26.15.x shipped a 7z filter (BCJ2 / ARM64) that the install-time
 * Nsis7z extractor cannot decode, so PE files (.exe / .dll) are silently skipped and
 * the install dir ends up with only Uninstall + data. Always pin BCJ before packaging.
 * See https://github.com/electron-userland/electron-builder/issues/9983
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

process.env.ELECTRON_BUILDER_7Z_FILTER = 'BCJ';

const require = createRequire(import.meta.url);
const electronBuilderCli = require.resolve('electron-builder/cli.js');
const extraArgs = process.argv.slice(2);
const result = spawnSync(
    process.execPath,
    [ electronBuilderCli, ...extraArgs ],
    {
        stdio: 'inherit',
        env: process.env,
        shell: false,
    },
);

process.exit(result.status ?? 1);
