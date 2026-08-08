# 34. Dry-Run Planning

The Planner is essentially a continuous "Dry-Run" engine.

Because it does not execute any operations, the UI can continually poll the Planner as the user types or selects missing entities. 

For example, if the user says "Assign Budi", the Planner generates a plan that identifies `DRIVER` is resolved, but `JOB_ORDER` is missing. Because the structural requirement of the payload cannot be fulfilled, the `isReadyForExecution` flag returns `false`.

The UI can interpret this structural gap and render a selection dropdown for the missing `JOB_ORDER`. Once the user selects it, the UI triggers the Planner again, which evaluates the payload as structurally complete and marks `isReadyForExecution = true`.
