import type { WorldPosition } from '../grid/types';
import { stepTowardWorldTarget } from './followPath';

export const combineFlowAndSeparation = (
    from: WorldPosition,
    flowDirection: WorldPosition | null,
    fallbackGoal: WorldPosition,
    speed: number,
    separationOffset: WorldPosition,
): WorldPosition =>
{
    const flow = flowDirection ?? normalizeToward(from, fallbackGoal);

    if (!flow)
    {
        return { ...from };
    }

    let vx = flow.x * speed + separationOffset.x;
    let vy = flow.y * speed + separationOffset.y;
    const magnitude = Math.hypot(vx, vy);

    if (magnitude < 0.001)
    {
        return { ...from };
    }

    if (magnitude > speed)
    {
        vx = (vx / magnitude) * speed;
        vy = (vy / magnitude) * speed;
    }

    return { x: from.x + vx, y: from.y + vy };
};

const normalizeToward = (from: WorldPosition, to: WorldPosition): WorldPosition | null =>
{
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 0.001)
    {
        return null;
    }

    return { x: dx / distance, y: dy / distance };
};

export const stepDirectlyToward = (
    from: WorldPosition,
    goal: WorldPosition,
    speed: number,
): WorldPosition => stepTowardWorldTarget(from, goal, speed);
