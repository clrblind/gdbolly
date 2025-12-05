
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    windows: {
        // Example: 'cpu': { id: 'cpu', title: 'CPU', x: 0, y: 0, w: 600, h: 400, z: 1, maximized: false, closed: false }
        'cpu': { id: 'cpu', title: 'CPU', x: 20, y: 20, w: 800, h: 500, z: 10, maximized: false, closed: false },
        'logs': { id: 'logs', title: 'System Logs', x: 40, y: 40, w: 600, h: 300, z: 11, maximized: false, closed: true },
        'debug_log': { id: 'debug_log', title: 'Log', x: 60, y: 60, w: 600, h: 300, z: 12, maximized: false, closed: true },
    },
    activeWindowId: null,
    maxZ: 100,
};

export const windowsSlice = createSlice({
    name: 'windows',
    initialState,
    reducers: {
        openWindow: (state, action) => {
            const id = action.payload;
            if (state.windows[id]) {
                state.windows[id].closed = false;
                state.windows[id].z = state.maxZ + 1;
                state.maxZ += 1;
                state.activeWindowId = id;
            }
        },
        closeWindow: (state, action) => {
            const id = action.payload;
            if (state.windows[id]) {
                state.windows[id].closed = true;
            }
        },
        focusWindow: (state, action) => {
            const id = action.payload;
            if (state.windows[id] && !state.windows[id].closed) {
                state.windows[id].z = state.maxZ + 1;
                state.maxZ += 1;
                state.activeWindowId = id;
            }
        },
        moveWindow: (state, action) => {
            const { id, x, y } = action.payload;
            if (state.windows[id]) {
                state.windows[id].x = x;
                state.windows[id].y = y;
            }
        },
        resizeWindow: (state, action) => {
            const { id, w, h } = action.payload;
            if (state.windows[id]) {
                state.windows[id].w = w;
                state.windows[id].h = h;
            }
        },
        toggleMaximize: (state, action) => {
            const id = action.payload;
            if (state.windows[id]) {
                state.windows[id].maximized = !state.windows[id].maximized;
                // If maximizing, bring to front
                if (state.windows[id].maximized) {
                    state.windows[id].z = state.maxZ + 1;
                    state.maxZ += 1;
                    state.activeWindowId = id;
                }
            }
        }
    }
});

export const {
    openWindow, closeWindow, focusWindow, moveWindow, resizeWindow, toggleMaximize
} = windowsSlice.actions;

export default windowsSlice.reducer;
