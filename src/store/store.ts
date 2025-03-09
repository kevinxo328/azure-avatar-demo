import { create } from "zustand";

import {
  createRealtimeAvatarSlice,
  RealtimeAvatarSlice,
} from "./realtimeAvatarSlice";

export type BoundStore = RealtimeAvatarSlice;

export const useBoundStore = create<BoundStore>()((...a) => ({
  ...createRealtimeAvatarSlice(...a),
}));
