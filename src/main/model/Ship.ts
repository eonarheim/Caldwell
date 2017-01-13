/// <reference path="../../../typings/index.d.ts" />

import { Bag } from 'typescript-collections';


import { Identifiable } from "./General";
import { ItemBase, Resourceable, ResourceData, SlotConsumer, SlotProvider } from "./Equippable";
import { HasSlots, UsesSlots } from "./Equippable";

/**
 * A special case of item that consumes no slots.
 */
export class Ship extends ItemBase {

    constructor(
        id:string, // must be globally unique
        name:string,
        mass:number, // kg
        energyDraw:number, // watts

        private slotsProvided:string[] // list of slots that other equipment can go into
        ) {
            super(
                id, 
                name,
                new SlotConsumer([]),
                new SlotProvider(slotsProvided), 
                new ResourceData(mass, energyDraw)
            );
        }

}

console.log(JSON.stringify(
    [
        new Ship("ship_destroyer_distantMountain", "Distant Mountain-class destroyer", 120000000, 1000, ["slot_engine_large", "slot_reactor_large", "slot_weapon_railgun", "slot_weapon_autocannon", "slot_weapon_autocannon"]),
        new Ship("ship_shuttle_lifeboat", "Severn-class shuttle", 30000, 10,  ["slot_engine_small", "slot_reactor_small", "slot_weapon_machinegun"]),
        new Ship("ship_corvette_kamorta", "Kamorta-class corvette", 3000000, 100, ["slot_engine_medium", "slot_reactor_medium", "slot_weapon_autocannon"])
    ]
));