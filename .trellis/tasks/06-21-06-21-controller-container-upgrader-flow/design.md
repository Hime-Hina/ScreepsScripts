# Controller container upgrader flow design

This task follows active hauler logistics. It should be small:

- branch `role === 'upgrader'` before generic worker behavior;
- in harvesting mode select controller-local withdrawal target first;
- in working mode choose `upgradeController` for same-room controller;
- if controller-local energy is unavailable, fall back to generic acquisition rather than idling forever;
- do not change spawn demand or construction planning here.
