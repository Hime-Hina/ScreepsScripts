# P6 expansion readiness gates design

Add a small pure function to `room-intel.ts` rather than starting live expansion. It takes local readiness signals and returns `{ready, missingPrerequisites}`. This keeps P6 as a safe precondition layer and avoids live claim/remote mining side effects.
