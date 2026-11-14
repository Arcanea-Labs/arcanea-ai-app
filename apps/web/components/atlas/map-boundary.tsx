'use client';
import { Component, type ReactNode } from 'react';

/** A missing or lost GPU must never take down the index, chronology or reading context. */
export class MapBoundary extends Component<{ children: ReactNode; onReturn: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="atlas-unplaced" role="status"><h2>This view needs<br/><em>WebGL.</em></h2><p>The browser could not create a graphics context. Your places, timeline and reading context are still available.</p><button onClick={this.props.onReturn}>Return to the available map</button></div> : this.props.children;
  }
}
