import type { SourceNavigation } from '../world/source-map.ts';
export type GameMode = 'survival' | 'objective';
export const HOSPITAL = {
    id: 'hospital', name: 'No Mercy · Hospital', location: 'MERCY HOSPITAL · L4D2',
    description: 'The original hospital interior, stairwells and construction floor.',
} as const;
export function createHospitalMap(nav: SourceNavigation) {
    return {
        ...HOSPITAL, spawn: nav.closest({ x: 0, z: 0 }), yaw: 0,
        entrances: nav.areas.map((_, i) => i),
        objectives: [
            { title: 'Restore hospital power', action: 'RESTORE POWER', area: nav.closest({ x: 12, z: 25, y: 10.4 }), hold: 3 },
            { title: 'Secure the elevator landing', action: 'CALL RESCUE', area: nav.closest({ x: 25.7, z: 65.8, y: 10.4 }), hold: 4 },
            { title: 'Reach the upper construction floor', action: 'OPEN EXTRACTION', area: nav.closest({ x: -22, z: 62, y: 140.2 }), hold: 5 },
        ],
    };
}
