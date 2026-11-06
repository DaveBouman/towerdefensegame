/**
 * Fails Vite resolve if UI/client code imports server-only auto-battler modules.
 */
const FORBIDDEN_SUBSTRINGS = [
    'autoBattler/battle',
    'autoBattler/shop',
    'autoBattler/ai/',
    'autoBattler/run/',
    'autoBattler/unitRegistry',
    'autoBattler/config/rules',
    'autoBattler/server',
    'autoBattler/serverOnly',
];

const isClientImporter = (importer = '') =>
    /src[/\\](ui|autoBattlerController|App\.tsx)/.test(importer);

export const blockServerAutoBattler = () =>
    ({
        name: 'block-server-auto-battler',
        enforce: 'pre',
        resolveId (source, importer)
        {
            if (!importer || !isClientImporter(importer))
            {
                return null;
            }

            const normalized = source.replace(/\\/g, '/');

            for (const fragment of FORBIDDEN_SUBSTRINGS)
            {
                if (normalized.includes(fragment))
                {
                    throw new Error(
                        `[boundary] Client must not import server auto-battler module "${source}" from ${importer}`,
                    );
                }
            }

            return null;
        },
    });
