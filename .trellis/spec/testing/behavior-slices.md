# Behavior Slices

## Shape

Screeps behavior slices should be written as:

```text
Given <game/runtime state>
When <one tick or operation runs>
Then <observable decision, action, state update, log, or deployment result>
And <boundary not crossed or explicitly mocked>
```

## Valid Observables

Valid expected outcomes include:

- Returned typed decision.
- Screeps action request through a boundary.
- Memory state update through the memory owner.
- Console line through runtime output.
- Built artifact behavior.
- Live verification record.

Invalid expected outcomes:

- Private helper was called.
- Internal array was sorted a certain way without observable consequence.
- Strategy module was mocked instead of tested through a public operation.

## Slice Size

One slice should fit one red-green-refactor loop. Examples:

- Good: "When no spawn exists, record that production heartbeat cannot be naturally observed."
- Good: "Given current CPU is low, skip non-critical remote room scan this tick."
- Bad: "Implement automated economy."
- Bad: "Build full room AI."

If a slice needs several modules, define the public operation first and add only the collaborators required for that behavior.
