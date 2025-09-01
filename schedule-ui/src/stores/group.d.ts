declare module '@/stores/group' {
  import { DefineStore } from 'pinia';
  
  interface Group {
    id: number;
    name: string;
    description: string;
    type: string;
    memberIds: number[];
    applicableRoles: string[];
    isActive: boolean;
  }

  export const useGroupStore: DefineStore<'group', {
    groups: Group[];
    loading: boolean;
    lastUpdated: Date | null;
  }, {
    groupMap(): Map<number, Group>;
    getGroupName(id: number): string;
  }, {
    fetchGroups(): Promise<void>;
    refreshIfStale(): Promise<void>;
    getGroupById(id: number): Group | undefined;
    addGroup(groupData: Omit<Group, 'id'>): Promise<Group>;
    updateGroup(updatedGroup: Group): Promise<void>;
    deleteGroup(groupId: number): Promise<void>;
  }>;
}