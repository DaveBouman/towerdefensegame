import { loadImageTexture } from '../../../assets/loadImageTexture';
import {
    getSteamPersonaTextureKey,
    hydrateSteamPersonas,
    listSteamPersonasToPreload,
} from '../../../desktop/steamAvatars';

/** Registers Steam persona textures when the desktop shell provides them. */
export const preloadSteamPortraits = async (scene: Phaser.Scene): Promise<void> =>
{
    await hydrateSteamPersonas();

    await Promise.all(listSteamPersonasToPreload().map((persona) =>
        loadImageTexture(
            scene,
            getSteamPersonaTextureKey(persona.steamId),
            persona.avatarUrl,
        ).catch((error) =>
        {
            console.warn(error);
        }),
    ));
};
