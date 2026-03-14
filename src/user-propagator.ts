import type { CallbackRegistry } from './callback-registry.js';
import type {
  UnsafeZ3Api,
  EmscriptenModule,
  Z3_context,
  Z3_solver,
  Z3_solver_callback,
  Z3_ast,
  UserPropagatorCallbacks,
  Disposer,
  WasmFnPtr,
} from './types.js';
import { CALLBACK_SIGNATURES } from './types.js';

interface PropagatorState<S> {
  userState: S;
  callbacks: UserPropagatorCallbacks<S>;
  ptrs: WasmFnPtr[];
  handleId: number;
}

/**
 * Shared error channel between callback wrappers and solveSync.
 * When a callback throws, the error is stored here and Z3_interrupt
 * is called to stop the solver. solveSync checks this after Z3 returns
 * and re-throws the original error.
 */
export interface CallbackErrorChannel {
  error: unknown | null;
}

export function attachUserPropagator<S>(
  mod: EmscriptenModule,
  raw: UnsafeZ3Api,
  registry: CallbackRegistry,
  ctx: Z3_context,
  solver: Z3_solver,
  initialState: S,
  callbacks: UserPropagatorCallbacks<S>,
  errorChannel: CallbackErrorChannel,
): Disposer {
  const ptrs: WasmFnPtr[] = [];
  const childHandleIds = new Set<number>();

  const state: PropagatorState<S> = {
    userState: initialState,
    callbacks,
    ptrs,
    handleId: 0,
  };

  const handleId = registry.createHandle(state);
  state.handleId = handleId;

  function getState(userCtxPtr: number): PropagatorState<S> {
    return registry.getHandle<PropagatorState<S>>(userCtxPtr);
  }

  function trapError(err: unknown) {
    if (!errorChannel.error) {
      errorChannel.error = err;
      raw.Z3_interrupt(ctx);
    }
  }

  // ── Lifecycle callbacks ──────────────────────────────────────

  const pushPtr = registry.addCallback(
    CALLBACK_SIGNATURES.Z3_push_eh,
    (userCtx: number, _cb: number) => {
      if (errorChannel.error) return;
      try {
        const s = getState(userCtx);
        s.callbacks.onPush?.(s.userState, _cb as unknown as Z3_solver_callback);
      } catch (err) { trapError(err); }
    },
  );
  ptrs.push(pushPtr);

  const popPtr = registry.addCallback(
    CALLBACK_SIGNATURES.Z3_pop_eh,
    (userCtx: number, _cb: number, numScopes: number) => {
      if (errorChannel.error) return;
      try {
        const s = getState(userCtx);
        s.callbacks.onPop?.(s.userState, _cb as unknown as Z3_solver_callback, numScopes);
      } catch (err) { trapError(err); }
    },
  );
  ptrs.push(popPtr);

  const freshPtr = registry.addCallback(
    CALLBACK_SIGNATURES.Z3_fresh_eh,
    (userCtx: number, newCtx: number): number => {
      if (errorChannel.error) return userCtx;
      try {
        const s = getState(userCtx);
        if (s.callbacks.onFresh) {
          const freshState = s.callbacks.onFresh(s.userState, newCtx as unknown as Z3_context);
          const freshPropState: PropagatorState<S> = {
            userState: freshState, callbacks: s.callbacks, ptrs: [], handleId: 0,
          };
          const freshHandleId = registry.createHandle(freshPropState);
          freshPropState.handleId = freshHandleId;
          childHandleIds.add(freshHandleId);
          return freshHandleId;
        }
        return userCtx;
      } catch (err) { trapError(err); return userCtx; }
    },
  );
  ptrs.push(freshPtr);

  raw.Z3_solver_propagate_init(ctx, solver, handleId, pushPtr, popPtr, freshPtr);

  // ── Optional event callbacks ─────────────────────────────────

  if (callbacks.onFixed) {
    const ptr = registry.addCallback(
      CALLBACK_SIGNATURES.Z3_fixed_eh,
      (userCtx: number, cb: number, t: number, v: number) => {
        if (errorChannel.error) return;
        try {
          const s = getState(userCtx);
          s.callbacks.onFixed!(s.userState, cb as unknown as Z3_solver_callback, t as unknown as Z3_ast, v as unknown as Z3_ast);
        } catch (err) { trapError(err); }
      },
    );
    ptrs.push(ptr);
    raw.Z3_solver_propagate_fixed(ctx, solver, ptr);
  }

  if (callbacks.onEq) {
    const ptr = registry.addCallback(
      CALLBACK_SIGNATURES.Z3_eq_eh,
      (userCtx: number, cb: number, lhs: number, rhs: number) => {
        if (errorChannel.error) return;
        try {
          const s = getState(userCtx);
          s.callbacks.onEq!(s.userState, cb as unknown as Z3_solver_callback, lhs as unknown as Z3_ast, rhs as unknown as Z3_ast);
        } catch (err) { trapError(err); }
      },
    );
    ptrs.push(ptr);
    raw.Z3_solver_propagate_eq(ctx, solver, ptr);
  }

  if (callbacks.onDiseq) {
    const ptr = registry.addCallback(
      CALLBACK_SIGNATURES.Z3_diseq_eh,
      (userCtx: number, cb: number, lhs: number, rhs: number) => {
        if (errorChannel.error) return;
        try {
          const s = getState(userCtx);
          s.callbacks.onDiseq!(s.userState, cb as unknown as Z3_solver_callback, lhs as unknown as Z3_ast, rhs as unknown as Z3_ast);
        } catch (err) { trapError(err); }
      },
    );
    ptrs.push(ptr);
    raw.Z3_solver_propagate_diseq(ctx, solver, ptr);
  }

  if (callbacks.onFinal) {
    const ptr = registry.addCallback(
      CALLBACK_SIGNATURES.Z3_final_eh,
      (userCtx: number, cb: number): number => {
        if (errorChannel.error) return 1;
        try {
          const s = getState(userCtx);
          const result = s.callbacks.onFinal!(s.userState, cb as unknown as Z3_solver_callback);
          return result === false ? 0 : 1;
        } catch (err) { trapError(err); return 1; }
      },
    );
    ptrs.push(ptr);
    raw.Z3_solver_propagate_final(ctx, solver, ptr);
  }

  if (callbacks.onCreated) {
    const ptr = registry.addCallback(
      CALLBACK_SIGNATURES.Z3_created_eh,
      (userCtx: number, cb: number, t: number) => {
        if (errorChannel.error) return;
        try {
          const s = getState(userCtx);
          s.callbacks.onCreated!(s.userState, cb as unknown as Z3_solver_callback, t as unknown as Z3_ast);
        } catch (err) { trapError(err); }
      },
    );
    ptrs.push(ptr);
    raw.Z3_solver_propagate_created(ctx, solver, ptr);
  }

  if (callbacks.onDecide) {
    const ptr = registry.addCallback(
      CALLBACK_SIGNATURES.Z3_decide_eh,
      (userCtx: number, cb: number, t: number, idx: number, phase: number) => {
        if (errorChannel.error) return;
        try {
          const s = getState(userCtx);
          s.callbacks.onDecide!(s.userState, cb as unknown as Z3_solver_callback, t as unknown as Z3_ast, idx, !!phase);
        } catch (err) { trapError(err); }
      },
    );
    ptrs.push(ptr);
    raw.Z3_solver_propagate_decide(ctx, solver, ptr);
  }

  if (callbacks.onBinding) {
    const ptr = registry.addCallback(
      CALLBACK_SIGNATURES.Z3_on_binding_eh,
      (userCtx: number, cb: number, q: number, inst: number): number => {
        if (errorChannel.error) return 1;
        try {
          const s = getState(userCtx);
          const result = s.callbacks.onBinding!(s.userState, cb as unknown as Z3_solver_callback, q as unknown as Z3_ast, inst as unknown as Z3_ast);
          return result ? 1 : 0;
        } catch (err) { trapError(err); return 1; }
      },
    );
    ptrs.push(ptr);
    raw.Z3_solver_propagate_on_binding(ctx, solver, ptr);
  }

  // ── Disposer ─────────────────────────────────────────────────

  return () => {
    for (const ptr of ptrs) registry.removeCallback(ptr);
    for (const id of childHandleIds) registry.deleteHandle(id);
    registry.deleteHandle(handleId);
  };
}
