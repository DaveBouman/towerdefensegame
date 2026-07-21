import { CYBER } from '../../../config/cyberpunkTheme';
import { createAlphaGlowVisual, createPulseGlowVisual } from './glowVisualFactory';

export const attackGlowVisual = createPulseGlowVisual({
    id: 'attack',
    fill: CYBER.attackGlow,
    stroke: CYBER.attackStroke,
    fillAlpha: 0.22,
    pad: 18,
    strokeWidth: 5,
    scale: 1.07,
    duration: 340,
});

export const defendGlowVisual = createPulseGlowVisual({
    id: 'defend',
    fill: CYBER.defendGlow,
    stroke: CYBER.defendStroke,
    fillAlpha: 0.2,
    pad: 18,
    strokeWidth: 5,
    scale: 1.05,
    duration: 400,
});

export const boostGlowVisual = createPulseGlowVisual({
    id: 'boost',
    fill: CYBER.buffGlow,
    stroke: CYBER.buffStroke,
    fillAlpha: 0.24,
    pad: 14,
    strokeWidth: 4,
    scale: 1.04,
    duration: 300,
});

export const fireGlowVisual = createPulseGlowVisual({
    id: 'fire',
    fill: 0xff6b35,
    stroke: 0xff9f43,
    fillAlpha: 0.3,
    pad: 14,
    strokeWidth: 4,
    scale: 1.05,
    duration: 280,
});

export const echoGlowVisual = createPulseGlowVisual({
    id: 'echo',
    fill: 0x5ce1e6,
    stroke: 0xb8f8ff,
    fillAlpha: 0.24,
    pad: 18,
    strokeWidth: 5,
    scale: 1.1,
    duration: 320,
});

export const jokerGlowVisual = createPulseGlowVisual({
    id: 'joker',
    fill: 0xf1c40f,
    stroke: 0xfff3bf,
    fillAlpha: 0.22,
    pad: 18,
    strokeWidth: 5,
    scale: 1.1,
    duration: 320,
});

export const fuseGlowVisual = createPulseGlowVisual({
    id: 'fuse',
    fill: 0xff6b35,
    stroke: 0xff9f43,
    fillAlpha: 0.3,
    pad: 16,
    strokeWidth: 4,
    scale: 1.08,
    duration: 180,
});

export const curseGlowVisual = createAlphaGlowVisual({
    id: 'curse',
    fill: 0x8e44ad,
    stroke: 0x9b59b6,
    fillAlpha: 0.22,
    pad: 14,
    strokeWidth: 4,
    alphaFrom: 0.35,
    alphaTo: 0.9,
    duration: 320,
    repeat: -1,
});

export const poisonGlowVisual = createAlphaGlowVisual({
    id: 'poison',
    fill: 0x27ae60,
    stroke: 0x58d68d,
    fillAlpha: 0.24,
    pad: 14,
    strokeWidth: 4,
    alphaFrom: 0.45,
    alphaTo: 1,
    duration: 280,
    repeat: -1,
});

export const courierGlowVisual = createAlphaGlowVisual({
    id: 'courier',
    fill: 0x3498db,
    stroke: 0xaed6f1,
    fillAlpha: 0.22,
    pad: 14,
    strokeWidth: 4,
    alphaFrom: 0.45,
    alphaTo: 1,
    duration: 260,
    repeat: -1,
});

export const loopResetGlowVisual = createAlphaGlowVisual({
    id: 'loop-reset',
    fill: 0x9b59b6,
    stroke: 0xe8daef,
    fillAlpha: 0.22,
    pad: 14,
    strokeWidth: 4,
    alphaFrom: 0.45,
    alphaTo: 1,
    duration: 320,
    repeat: -1,
});

export const hazardGlowVisual = createAlphaGlowVisual({
    id: 'hazard',
    fill: 0x2ecc71,
    stroke: 0x58d68d,
    fillAlpha: 0.25,
    pad: 14,
    strokeWidth: 4,
    alphaFrom: 0.4,
    alphaTo: 0.95,
    duration: 220,
    repeat: 1,
});
