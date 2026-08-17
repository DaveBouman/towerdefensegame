import { GameHud } from './GameHud';
import { PuzzleHud } from './PuzzleHud';
import { PuzzleResultOverlay } from './PuzzleResultOverlay';
import { RunMapOverlay } from './RunMapOverlay';
import { RunEndOverlay } from './RunEndOverlay';
import { CardRewardOverlay } from './CardRewardOverlay';
import { PendingCardDirectionOverlay } from './PendingCardDirectionOverlay';
import { BodyModRewardOverlay } from './BodyModRewardOverlay';
import { CombatRecapStrip } from './CombatRecapStrip';
import { NodeVisitOverlay } from './NodeVisitOverlay';
import { ShopOverlay } from './ShopOverlay';
import { RunEventOverlay } from './RunEventOverlay';
import { RestOverlay } from './RestOverlay';
import { PileViewOverlay } from './PileViewOverlay';
import {
    TutorialIntroOverlay,
    TutorialCoachStrip,
    TutorialOffChainTipOverlay,
    TutorialRewardTipOverlay,
} from '../tutorial/Tutorial';
import { RunToast } from './RunToast';
import { FloorBanner } from './FloorBanner';
import { BattleIntroOverlay } from './BattleIntroOverlay';
import { GameMenuButton } from './GameMenuButton';
import { MainMenuOverlay } from './MainMenuOverlay';
import { BodyModsPanel } from './BodyModsPanel';
import { BATTLE_REWARD_RULES, PUZZLE_TRIAL_RULES } from '../../game/run/rewards';
import { GAME_RULES } from '../../game/cardGame/config/cardRegistry';
import { RUN_CONFIG } from '../../game/run/runMap';
import type { RunController } from '../../runController/useRunController';

type RunPhaseScreensProps = RunController;

export const RunPhaseScreens = (props: RunPhaseScreensProps) =>
{
    const {
        phase,
        pauseMenuOpen,
        bodyMods,
        runAttackCount,
        seed,
        tutorial,
        map,
        path,
        playerHealth,
        runMaxHealth,
        gold,
        deck,
        currentFloor,
        floorRerollsRemaining,
        ascensionLevel,
        departingNodeId,
        availableIds,
        floorBanner,
        setFloorBanner,
        runToast,
        setRunToast,
        battleIntroKind,
        finishBattleIntro,
        pickNode,
        pendingRewardFlow,
        currentRewardStep,
        deckArchetypeScores,
        rewardSynergyHints,
        finishReward,
        finishBodyModReward,
        rerollReward,
        pendingPuzzleReward,
        pendingCardDirectionFlow,
        completePendingCardDirections,
        finishPuzzleReward,
        visit,
        finishEvent,
        startPuzzleFromEvent,
        restHeal,
        restUpgrade,
        finishVisit,
        confirmShopCardPurchase,
        buyShopBodyMod,
        buyShopHeal,
        buyShopRemove,
        buyShopReroute,
        buyShopUpgrade,
        puzzleResult,
        finishPuzzleResult,
        clutchVictory,
        runStats,
        ascensionUnlockedToast,
        startRunFromMenu,
        closePauseMenu,
        startNewRun,
        returnToMenu,
        togglePauseMenu,
        combatRecapLines,
    } = props;

    return (
        <>
            {phase !== 'victory' && phase !== 'defeat' && phase !== 'menu' && (
                <GameMenuButton open={pauseMenuOpen} onClick={togglePauseMenu} />
            )}
            {bodyMods.length > 0 && (phase === 'battle' || phase === 'puzzle') && (
                <BodyModsPanel
                    bodyMods={bodyMods}
                    runAttackCount={runAttackCount}
                    className="body-mods-panel--persistent"
                />
            )}
            {phase === 'menu' && (
                <MainMenuOverlay
                    mode="boot"
                    seed={seed}
                    ascensionLevel={ascensionLevel}
                    onStart={startRunFromMenu}
                    onReplayTutorial={tutorial.replayTutorial}
                />
            )}
            {pauseMenuOpen && phase !== 'menu' && phase !== 'victory' && phase !== 'defeat' && (
                <MainMenuOverlay
                    mode="pause"
                    seed={seed}
                    ascensionLevel={ascensionLevel}
                    onStart={closePauseMenu}
                    onResume={closePauseMenu}
                    onNewRun={startNewRun}
                    onReplayTutorial={tutorial.replayTutorial}
                />
            )}
            {phase === 'battle' && (
                <>
                    <GameHud />
                    <CombatRecapStrip lines={combatRecapLines} />
                    {tutorial.showBattleCoach && (
                        <TutorialCoachStrip onDismiss={tutorial.dismissBattleCoach} />
                    )}
                    {tutorial.showOffChainTip && (
                        <TutorialOffChainTipOverlay onDismiss={tutorial.dismissOffChainTip} />
                    )}
                </>
            )}
            {phase === 'puzzle' && (
                <>
                    <GameHud />
                    <PuzzleHud />
                </>
            )}
            <PileViewOverlay />
            {phase === 'map' && tutorial.showIntro && (
                <TutorialIntroOverlay onDismiss={tutorial.dismissIntro} />
            )}
            {tutorial.showRewardTip && (
                <TutorialRewardTipOverlay onDismiss={tutorial.dismissRewardTip} />
            )}
            {floorBanner !== null && (
                <FloorBanner floor={floorBanner} onDone={() => setFloorBanner(null)} />
            )}
            {runToast && (
                <RunToast message={runToast} tone="good" onDone={() => setRunToast(null)} />
            )}
            {battleIntroKind && (
                <BattleIntroOverlay nodeKind={battleIntroKind} onDone={finishBattleIntro} />
            )}
            {phase === 'map' && !tutorial.showIntro && (
                <RunMapOverlay
                    map={map}
                    path={path}
                    availableIds={availableIds}
                    departingNodeId={departingNodeId}
                    playerHealth={playerHealth}
                    maxHealth={runMaxHealth}
                    gold={gold}
                    currentFloor={currentFloor}
                    floorCount={RUN_CONFIG.mapFloorCount}
                    bodyMods={bodyMods}
                    floorRerollsRemaining={floorRerollsRemaining}
                    floorRerollsMax={GAME_RULES.rerollsPerFloor}
                    ascensionLevel={ascensionLevel}
                    seed={seed}
                    onPick={pickNode}
                />
            )}
            {phase === 'reward' && currentRewardStep?.kind === 'card' && (
                <CardRewardOverlay
                    options={currentRewardStep.options}
                    deck={deck}
                    pickCount={currentRewardStep.reward.pickCount}
                    rerollable={currentRewardStep.reward.rerollable}
                    rules={BATTLE_REWARD_RULES}
                    eyebrow={pendingRewardFlow?.nodeKind === 'semi-boss' ? 'Lieutenant spoils' : 'Victory spoils'}
                    subtitle={deckArchetypeScores.dominant
                        ? `Deck specialty: ${deckArchetypeScores.dominant.charAt(0).toUpperCase()}${deckArchetypeScores.dominant.slice(1)}`
                        : undefined}
                    synergyHints={rewardSynergyHints}
                    onConfirm={finishReward}
                    onSkip={() => finishReward([])}
                    onReroll={rerollReward}
                />
            )}
            {phase === 'body-mod-reward' && currentRewardStep?.kind === 'body-mod' && (
                <BodyModRewardOverlay
                    options={currentRewardStep.options}
                    eyebrow={pendingRewardFlow?.nodeKind === 'boss' ? 'Warden body mod' : 'Lieutenant body mod'}
                    title={pendingRewardFlow?.nodeKind === 'boss'
                        ? 'Claim the Gatekeeper Seal'
                        : 'Install a body mod'}
                    subtitle="Permanent for the rest of the run."
                    onConfirm={finishBodyModReward}
                />
            )}
            {phase === 'puzzle-reward' && pendingPuzzleReward && (
                <CardRewardOverlay
                    eyebrow="Trial passed"
                    title="Choose a card reward"
                    subtitle={`Dealt ${pendingPuzzleReward.damageDealt} / ${pendingPuzzleReward.damageTarget} damage.`}
                    rules={PUZZLE_TRIAL_RULES}
                    deck={deck}
                    options={pendingPuzzleReward.options}
                    pickCount={1}
                    rerollable={false}
                    onConfirm={finishPuzzleReward}
                />
            )}
            {phase === 'visit' && visit && visit.eventId && (
                <RunEventOverlay
                    eventId={visit.eventId}
                    nodeId={visit.node.id}
                    seed={seed}
                    playerHealth={playerHealth}
                    maxHealth={runMaxHealth}
                    gold={gold}
                    deck={deck}
                    bodyMods={bodyMods}
                    onFinish={finishEvent}
                    onStartPuzzle={startPuzzleFromEvent}
                />
            )}
            {phase === 'visit' && visit && !visit.eventId && visit.node.kind === 'rest' && (
                <RestOverlay
                    deck={deck}
                    playerHealth={playerHealth}
                    maxHealth={runMaxHealth}
                    onRest={restHeal}
                    onUpgrade={restUpgrade}
                    onContinue={finishVisit}
                />
            )}
            {pendingCardDirectionFlow && (
                <PendingCardDirectionOverlay
                    definitionIds={pendingCardDirectionFlow.definitionIds}
                    eyebrow="Signal routing"
                    title="Choose chain direction"
                    subtitle="New cards need a fixed route before the next fight."
                    onComplete={completePendingCardDirections}
                />
            )}
            {phase === 'visit' && visit && !visit.eventId && visit.node.kind === 'shop' && visit.shopOffers && (
                <ShopOverlay
                    offers={visit.shopOffers}
                    gold={gold}
                    deck={deck}
                    playerHealth={playerHealth}
                    maxHealth={runMaxHealth}
                    onConfirmCardPurchase={confirmShopCardPurchase}
                    onBuyBodyMod={buyShopBodyMod}
                    onBuyHeal={buyShopHeal}
                    onBuyRemove={buyShopRemove}
                    onBuyReroute={buyShopReroute}
                    onBuyUpgrade={buyShopUpgrade}
                    onContinue={finishVisit}
                />
            )}
            {phase === 'visit' && visit && !visit.eventId && visit.node.kind !== 'shop' && visit.node.kind !== 'rest' && (
                <NodeVisitOverlay node={visit.node} gold={gold} onContinue={finishVisit} />
            )}
            {phase === 'puzzle-result' && puzzleResult && (
                <PuzzleResultOverlay
                    puzzleId={puzzleResult.puzzleId}
                    success={puzzleResult.success}
                    damageDealt={puzzleResult.damageDealt}
                    damageTarget={puzzleResult.damageTarget}
                    messages={puzzleResult.messages}
                    onContinue={finishPuzzleResult}
                />
            )}
            {phase === 'victory' && (
                <RunEndOverlay
                    variant="victory"
                    clutch={clutchVictory}
                    stats={runStats}
                    unlockedAscension={ascensionUnlockedToast}
                    onRestart={startNewRun}
                    onMainMenu={returnToMenu}
                />
            )}
            {phase === 'defeat' && (
                <RunEndOverlay
                    variant="defeat"
                    stats={{ ...runStats, pathLength: path.length }}
                    onRestart={startNewRun}
                    onMainMenu={returnToMenu}
                />
            )}
        </>
    );
};
