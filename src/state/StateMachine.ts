/**
 * Generic finite state machine for game state management
 * Every state transition goes through this single point
 */

export type StateGuard = () => boolean;
export type StateCallback = () => void;

interface StateTransition {
  from: string;
  to: string;
  guard?: StateGuard;
  onExit?: StateCallback;
  onEnter?: StateCallback;
}

export class StateMachine {
  private currentState: string;
  private transitions: Map<string, StateTransition[]> = new Map();
  private stateCallbacks: Map<string, { onEnter?: StateCallback; onExit?: StateCallback }> = new Map();
  private isTransitioning = false;

  constructor(initialState: string) {
    this.currentState = initialState;
  }

  /**
   * Register a transition between states
   */
  addTransition(
    from: string,
    to: string,
    guard?: StateGuard,
    onExit?: StateCallback,
    onEnter?: StateCallback
  ): void {
    if (!this.transitions.has(from)) {
      this.transitions.set(from, []);
    }

    this.transitions.get(from)!.push({
      from,
      to,
      guard,
      onExit,
      onEnter,
    });
  }

  /**
   * Register callbacks for entering/exiting a state
   */
  addStateCallbacks(state: string, onEnter?: StateCallback, onExit?: StateCallback): void {
    if (!this.stateCallbacks.has(state)) {
      this.stateCallbacks.set(state, {});
    }
    const callbacks = this.stateCallbacks.get(state)!;
    if (onEnter) callbacks.onEnter = onEnter;
    if (onExit) callbacks.onExit = onExit;
  }

  /**
   * Attempt to transition to a new state
   */
  setState(newState: string): boolean {
    // Prevent recursive transitions
    if (this.isTransitioning) {
      console.warn(`[StateMachine] Cannot transition during another transition`);
      return false;
    }

    // Check if this state is the current state
    if (this.currentState === newState) {
      console.warn(`[StateMachine] Already in state '${newState}'`);
      return false;
    }

    // Check if a valid transition exists
    const validTransitions = this.transitions.get(this.currentState) || [];
    const transition = validTransitions.find(t => t.to === newState);

    if (!transition) {
      console.error(`[StateMachine] No transition from '${this.currentState}' to '${newState}'`);
      return false;
    }

    // Check guards
    if (transition.guard && !transition.guard()) {
      console.warn(`[StateMachine] Guard prevented transition from '${this.currentState}' to '${newState}'`);
      return false;
    }

    this.isTransitioning = true;

    // Exit current state
    const currentCallbacks = this.stateCallbacks.get(this.currentState);
    if (currentCallbacks?.onExit) {
      currentCallbacks.onExit();
    }
    if (transition.onExit) {
      transition.onExit();
    }

    // Change state
    const previousState = this.currentState;
    this.currentState = newState;

    // Enter new state
    const newCallbacks = this.stateCallbacks.get(newState);
    if (newCallbacks?.onEnter) {
      newCallbacks.onEnter();
    }
    if (transition.onEnter) {
      transition.onEnter();
    }

    this.isTransitioning = false;

    console.log(`[StateMachine] ${previousState} → ${newState}`);
    return true;
  }

  /**
   * Get the current state
   */
  getState(): string {
    return this.currentState;
  }

  /**
   * Check if in a specific state
   */
  isInState(state: string): boolean {
    return this.currentState === state;
  }

  /**
   * Check if currently transitioning
   */
  isInTransition(): boolean {
    return this.isTransitioning;
  }

  /**
   * Check if a transition exists
   */
  canTransitionTo(state: string): boolean {
    const validTransitions = this.transitions.get(this.currentState) || [];
    const transition = validTransitions.find(t => t.to === state);

    if (!transition) return false;
    if (transition.guard && !transition.guard()) return false;

    return true;
  }

  /**
   * Reset to initial state (useful for restarting game)
   */
  reset(initialState: string): void {
    this.currentState = initialState;
    this.isTransitioning = false;
  }
}
