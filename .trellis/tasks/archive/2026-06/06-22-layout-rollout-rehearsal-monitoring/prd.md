# PRD: Layout Rollout Rehearsal, Monitoring, and Operator Review

## Goal

Prepare the final dry-run and live rollout procedure for the aggressive layout redesign, including human-review artifacts, deploy gates, monitoring fields, and rollback handles.

## Scope

- Dry-run candidate output and migration diff.
- Operator review checklist with coordinates.
- Deployment checklist if code changes are approved.
- Short monitoring fields for room health, refillAccess, construction progress, and event bridge health.

## Non-Goals

- No deploy, rollback, PM2 restart, console write, or structure deletion unless explicitly authorized at rollout time.

## Acceptance Criteria

- Rollout report includes exact commands, expected outputs, rollback path, and stop conditions.
- Monitoring loop tracks status, module hash, heartbeat, workers/roles, spawn energy, construction progress, refillAccess, hostiles, CPU bucket, and PM2 bridge status.
- User can approve, reject, or request changes to the rollout plan before any live operation.
