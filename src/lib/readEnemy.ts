/* eslint-disable @typescript-eslint/no-require-imports */
import * as a1lib from 'alt1';
import * as TargetMob from 'alt1/targetmob';
import { roundedToFixed } from './utility';
import { Overlay } from '../types';
import { getSetting } from '../a1sauce/Settings/Storage';

const targetDisplay = new TargetMob.default();

const enemyDebuffImages = a1lib.webpackImages({
	invokeDeath: require('../asset/data/enemyDebuffs/death-mark.data.png'),
	bloat: require('../asset/data/enemyDebuffs/bloated.data.png'),
});

// Thanks to rodultra97 for PR to previous repo
const bloatInterval = new Map();
const bloat = 'bloat';

const combatInterval = new Map();
let combatTimer = undefined;
const outOfCombat = 'isInCombat';

export async function readEnemy(gauges: Overlay) {
	//TODO: Store LastPos and detect when to rescan to avoid spamming CHFRS in loop
	const targetData = targetDisplay.read();

	if (combatTimer === undefined) {
		combatTimer = parseInt(getSetting('combatTimer'), 10);
	}

	if (gauges.checkCombatStatus) {
		if (targetData) {
			gauges.isInCombat = true;
			if (combatInterval.has(outOfCombat)) {
				clearInterval(combatInterval.get(outOfCombat));
				combatInterval.delete(outOfCombat);
			}
		} else if (!targetData && !combatInterval.has(outOfCombat)) {
			const intervalId = setInterval(() => {
				const currentTick = combatTimer;

				if (currentTick > 0) {
					const nextTick = currentTick - 1;
					combatTimer = nextTick;
				} else {
					if (!targetData) {
						gauges.isInCombat = false;
						combatTimer = parseInt(getSetting('combatTimer'), 10);
					}
				}
			}, 1000);
			combatInterval.set(outOfCombat, intervalId);
		}
	} else {
		gauges.isInCombat = true;
		if (combatInterval.has(outOfCombat)) {
			clearInterval(combatInterval.get(outOfCombat));
			combatInterval.delete(outOfCombat);
		}
	}

	if (targetData && gauges.isInCombat) {
		const target_display_loc = {
			x: targetDisplay?.lastpos.x - 120,
			y: targetDisplay?.lastpos.y + 20,
			w: 150,
			h: 60,
		};

		const targetDebuffs = a1lib.captureHold(
			target_display_loc.x,
			target_display_loc.y,
			target_display_loc.w,
			target_display_loc.h
		);
		const targetIsDeathMarked = targetDebuffs.findSubimage(
			enemyDebuffImages.invokeDeath
		).length;
		if (targetIsDeathMarked) {
			gauges.necromancy.incantations.active[0] = true;
		} else if (!targetIsDeathMarked) {
			gauges.necromancy.incantations.active[0] = false;
		}

		const targetIsBloated = targetDebuffs.findSubimage(
			enemyDebuffImages.bloat
		).length;
		if (targetIsBloated && !bloatInterval.has(bloat)) {
			gauges.necromancy.bloat.time = 20.5;
			gauges.necromancy.bloat.active = true;
			const intervalId = setInterval(() => {
				const currentTick = gauges.necromancy.bloat.time;

				if (currentTick > 0) {
					const nextTick = parseFloat(
						roundedToFixed(currentTick - 0.6, 1)
					);
					gauges.necromancy.bloat.time = nextTick;
				} else {
					clearInterval(bloatInterval.get(bloat));
					bloatInterval.delete(bloat);
					gauges.necromancy.bloat.time = 0;
				}
			}, 600);
			bloatInterval.set(bloat, intervalId);
		} else if (!targetIsBloated) {
			if (bloatInterval.has(bloat)) {
				clearInterval(bloatInterval.get(bloat));
				bloatInterval.delete(bloat);
			}
			gauges.necromancy.bloat.time = 0;
			gauges.necromancy.bloat.active = false;
		}
	} else {
		gauges.necromancy.incantations.active[0] = false;
		gauges.necromancy.bloat.time = 0;
		gauges.necromancy.bloat.active = false;
	}
}
