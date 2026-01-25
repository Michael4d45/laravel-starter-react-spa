import { echo } from './echo';

interface NotificationSubscription {
    channel: any;
    refCount: number;
    callbacks: Set<(data: unknown) => void>;
}

interface PresenceSubscription {
    channel: any;
    refCount: number;
    hereCallbacks: Set<(members: any[]) => void>;
    joiningCallbacks: Set<(member: any) => void>;
    leavingCallbacks: Set<(member: any) => void>;
}

class EchoManager {
    private notificationSubscriptions = new Map<
        string,
        NotificationSubscription
    >();
    private presenceSubscriptions = new Map<string, PresenceSubscription>();

    subscribeNotifications(
        channelName: string,
        callback: (data: unknown) => void,
    ) {
        let sub = this.notificationSubscriptions.get(channelName);
        if (!sub) {
            sub = {
                channel: echo.private(channelName),
                refCount: 0,
                callbacks: new Set(),
            };
            this.notificationSubscriptions.set(channelName, sub);

            // Listen to the event
            const currentSub = sub;
            sub.channel.listen('.TestRealtimeEvent', (data: unknown) => {
                currentSub.callbacks.forEach((cb) => cb(data));
            });
        }
        sub.callbacks.add(callback);
        sub.refCount++;
    }

    unsubscribeNotifications(
        channelName: string,
        callback: (data: unknown) => void,
    ) {
        const sub = this.notificationSubscriptions.get(channelName);
        if (!sub) return;
        sub.callbacks.delete(callback);
        sub.refCount--;
        if (sub.refCount === 0) {
            sub.channel.stopListening('.TestRealtimeEvent');
            echo.leave(channelName);
            this.notificationSubscriptions.delete(channelName);
        }
    }

    subscribePresence(
        channelName: string,
        hereCallback: (members: any[]) => void,
        joiningCallback: (member: any) => void,
        leavingCallback: (member: any) => void,
    ) {
        let sub = this.presenceSubscriptions.get(channelName);
        if (!sub) {
            sub = {
                channel: echo.join(channelName),
                refCount: 0,
                hereCallbacks: new Set(),
                joiningCallbacks: new Set(),
                leavingCallbacks: new Set(),
            };
            this.presenceSubscriptions.set(channelName, sub);

            const currentSub = sub;
            sub.channel
                .here((members: any[]) => {
                    currentSub.hereCallbacks.forEach((cb) => cb(members));
                })
                .joining((member: any) => {
                    currentSub.joiningCallbacks.forEach((cb) => cb(member));
                })
                .leaving((member: any) => {
                    currentSub.leavingCallbacks.forEach((cb) => cb(member));
                });
        }
        sub.hereCallbacks.add(hereCallback);
        sub.joiningCallbacks.add(joiningCallback);
        sub.leavingCallbacks.add(leavingCallback);
        sub.refCount++;
    }

    unsubscribePresence(
        channelName: string,
        hereCallback: (members: any[]) => void,
        joiningCallback: (member: any) => void,
        leavingCallback: (member: any) => void,
    ) {
        const sub = this.presenceSubscriptions.get(channelName);
        if (!sub) return;
        sub.hereCallbacks.delete(hereCallback);
        sub.joiningCallbacks.delete(joiningCallback);
        sub.leavingCallbacks.delete(leavingCallback);
        sub.refCount--;
        if (sub.refCount === 0) {
            echo.leave(channelName);
            this.presenceSubscriptions.delete(channelName);
        }
    }
}

export const echoManager = new EchoManager();
