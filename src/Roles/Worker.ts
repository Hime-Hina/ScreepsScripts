export const Worker: IRolesBehavior = (workingData: IWorkingData): ICreepStates => {
  return {
    DoWork(creep: Creep): boolean { return true },
  }
};
