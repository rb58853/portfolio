import { createSlice } from "@reduxjs/toolkit";

// status: 'idle' | 'connecting' | 'ready' | 'offline'
// messages: { role: 'user', text }
//         | { role: 'assistant', streaming, response, projects, error }
// An assistant message is added empty with streaming: true when a question is
// sent, grows with each delta and is closed by the final frame.
// pendingQuestion: asked from a project, a skill or a role; the chat sends it
// as soon as it is open and free.
const initialState = {
    status: 'idle',
    messages: [],
    pendingQuestion: null,
    floatButton: 'active',
};

function streamingMessage(state) {
    const last = state.messages[state.messages.length - 1];
    return last?.streaming ? last : null;
}

export const wsSlice = createSlice({
    name: "ws",
    initialState,
    reducers: {
        setWsStatus: (state, action) => {
            state.status = action.payload;
        },
        addWsMessage: (state, action) => {
            state.messages.push(action.payload);
        },
        appendWsDelta: (state, action) => {
            const message = streamingMessage(state);
            if (message) message.response += action.payload;
        },
        // The server discarded what it had streamed and starts the answer again.
        resetWsStream: (state) => {
            const message = streamingMessage(state);
            if (message) message.response = '';
        },
        finishWsMessage: (state, action) => {
            const message = streamingMessage(state);
            if (!message) return;
            message.streaming = false;
            message.response = action.payload.response;
            message.projects = action.payload.projects;
            message.error = action.payload.type === 'error';
        },
        queueWsQuestion: (state, action) => {
            state.pendingQuestion = action.payload;
        },
        clearWsQuestion: (state) => {
            state.pendingQuestion = null;
        },
        setFloatButton: (state, action) => {
            state.floatButton = action.payload;
        }
    }
});

export const { setWsStatus, addWsMessage, appendWsDelta, resetWsStream, finishWsMessage, queueWsQuestion, clearWsQuestion, setFloatButton } = wsSlice.actions;
export default wsSlice.reducer;
