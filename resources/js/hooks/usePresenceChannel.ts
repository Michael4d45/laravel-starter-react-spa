import { AuthContextState } from '@/contexts/AuthContext';
import { echoManager } from '@/lib/echoManager';
import { useEffect, useState } from 'react';

interface PresenceState {
    connected: boolean;
    members: Record<string, any>;
    count: number;
}

export function usePresenceChannel(
    authState: AuthContextState,
    channelName: string,
): PresenceState {
    const [state, setState] = useState<PresenceState>({
        connected: false,
        members: {},
        count: 0,
    });

    useEffect(() => {
        if (
            !authState.hasFetchedUser ||
            !authState.isAuthenticated ||
            !channelName
        ) {
            return;
        }

        console.info(`[usePresenceChannel] Joining ${channelName}`);
        const hereCallback = (members: any[]) => {
            const membersMap = members.reduce<Record<string, any>>(
                (acc, member) => {
                    acc[member.id] = member;
                    return acc;
                },
                {},
            );
            setState((prev) => ({
                ...prev,
                connected: true,
                members: membersMap,
                count: members.length,
            }));
        };

        const joiningCallback = (member: any) => {
            setState((prev) => ({
                ...prev,
                members: { ...prev.members, [member.id]: member },
                count: prev.count + 1,
            }));
        };

        const leavingCallback = (member: any) => {
            setState((prev) => {
                const { [member.id]: _, ...newMembers } = prev.members;
                return {
                    ...prev,
                    members: newMembers,
                    count: prev.count - 1,
                };
            });
        };

        echoManager.subscribePresence(
            channelName,
            hereCallback,
            joiningCallback,
            leavingCallback,
        );

        return () => {
            console.info(`[usePresenceChannel] Leaving ${channelName}`);
            echoManager.unsubscribePresence(
                channelName,
                hereCallback,
                joiningCallback,
                leavingCallback,
            );
            setState({ connected: false, members: {}, count: 0 });
        };
    }, [authState.hasFetchedUser, authState.isAuthenticated, channelName]);

    return state;
}
