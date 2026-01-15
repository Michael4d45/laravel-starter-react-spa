export type RealtimeConnectionState =
    | 'idle'
    | 'initialized'
    | 'connecting'
    | 'connected'
    | 'unavailable'
    | 'failed'
    | 'disconnected';

export interface RealtimeConnectionSnapshot {
    state: RealtimeConnectionState;
    isConnected: boolean;
    isConnecting: boolean;
    lastChangedAt: number;
}

type Listener = () => void;

const listeners = new Set<Listener>();

let snapshot: RealtimeConnectionSnapshot = {
    state: 'idle',
    isConnected: false,
    isConnecting: false,
    lastChangedAt: Date.now(),
};

function computeSnapshot(
    state: RealtimeConnectionState,
): RealtimeConnectionSnapshot {
    return {
        state,
        isConnected: state === 'connected',
        isConnecting: state === 'connecting' || state === 'initialized',
        lastChangedAt: Date.now(),
    };
}

export function setRealtimeConnectionState(
    state: RealtimeConnectionState,
): void {
    if (snapshot.state === state) {
        return;
    }

    snapshot = computeSnapshot(state);
    listeners.forEach((listener) => listener());
}

export function getRealtimeConnectionSnapshot(): RealtimeConnectionSnapshot {
    return snapshot;
}

export function subscribeRealtimeConnection(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
