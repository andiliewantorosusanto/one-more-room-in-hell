export type MapId = 'hospital' | 'depot';
export type GameMode = 'survival' | 'objective';
export type Cell = readonly [
    number,
    number
];
export type Rect = readonly [
    number,
    number,
    number,
    number
];
export type MapDefinition = {
    id: MapId;
    name: string;
    location: string;
    description: string;
    theme: 'hospital' | 'industrial';
    spawn: Cell;
    yaw: number;
    passages: readonly Rect[];
    obstacles: readonly Cell[];
    entrances: readonly Cell[];
    objectives: readonly {
        title: string;
        action: string;
        cell: Cell;
        hold: number;
    }[];
};
export const MAPS: readonly MapDefinition[] = [
    {
        id: 'hospital', name: 'Hospital Isolation', location: 'ST. BRIGID HOSPITAL',
        description: 'Contaminated wards, treatment rooms and tight circulation loops.', theme: 'hospital',
        spawn: [13, 19], yaw: Math.PI,
        passages: [[2, 2, 24, 4], [2, 18, 24, 20], [2, 2, 4, 20], [12, 2, 14, 20], [22, 2, 24, 20], [2, 10, 24, 12], [6, 6, 10, 8], [8, 5, 9, 6], [16, 6, 20, 8], [17, 8, 18, 10], [6, 14, 10, 16], [7, 12, 8, 14], [16, 14, 20, 16], [18, 16, 19, 18]],
        obstacles: [[7, 7], [18, 7], [8, 15], [17, 15]],
        entrances: [[3, 3], [23, 3], [3, 19], [23, 19], [3, 11], [23, 11]],
        objectives: [
            {
                title: 'Restore emergency power', action: 'RESTART GENERATOR', cell: [13, 3], hold: 3
            },
            {
                title: 'Transmit the evacuation signal', action: 'SEND DISTRESS SIGNAL', cell: [3, 11], hold: 4
            },
            {
                title: 'Open the service exit', action: 'UNSEAL EXIT', cell: [23, 19], hold: 5
            },
        ],
    },
    {
        id: 'depot', name: 'Freight Depot', location: 'BLACKWATER FREIGHT TERMINAL',
        description: 'Rusting cargo lanes, shuttered loading bays and a central sorting hall.', theme: 'industrial',
        spawn: [13, 19], yaw: Math.PI,
        passages: [[2, 2, 24, 4], [2, 18, 24, 20], [2, 2, 4, 20], [22, 2, 24, 20], [11, 2, 15, 20], [2, 9, 24, 13], [6, 6, 9, 8], [8, 4, 9, 6], [17, 6, 20, 8], [17, 4, 18, 6], [6, 14, 9, 16], [8, 12, 9, 14], [17, 14, 20, 16], [17, 12, 18, 14]],
        obstacles: [[7, 7], [18, 7], [7, 15], [18, 15]],
        entrances: [[3, 3], [23, 3], [3, 19], [23, 19], [3, 11], [23, 11]],
        objectives: [
            {
                title: 'Start the freight generator', action: 'RESTORE DEPOT POWER', cell: [5, 3], hold: 3
            },
            {
                title: 'Send the rescue coordinates', action: 'TRANSMIT COORDINATES', cell: [23, 3], hold: 4
            },
            {
                title: 'Release the loading-bay shutter', action: 'OPEN EXTRACTION BAY', cell: [13, 19], hold: 5
            },
        ],
    },
];
export function getMap(id: string): MapDefinition {
    return MAPS.find(map => map.id === id) ?? MAPS[0];
}
