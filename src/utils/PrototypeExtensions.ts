import { Upgrader } from "Roles/Upgrader"

const rolesBehaviors: {
  [roleName in Roles]?: IRolesBehavior
} = {
  // upgrader: Upgrader
};

export function PrototypeExtend(): void {
  Creep.prototype.Run = function (): void {
    // To get the config.
    // if (this.memory.configName) {
    //   const creepConfig = global.CreepConfig.Get(this.memory.configName);
    //   if (!creepConfig) {
    //     console.log(`${this.name}<${this.id}> don't have a valid config!`);
    //     return;
    //   }
    //   const creepRunLogic = rolesBehaviors[creepConfig.role](creepConfig.args);
    // }
  };
};
