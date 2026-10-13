import { chatWsUrl } from '../../environment/env'
import { addWsMessage, appendWsDelta, clearWsQuestion, finishWsMessage, resetWsStream, setWsStatus } from '../../redux/websocket/wsSlice'

const CONNECTION_LOST = {
    type: 'error',
    response: 'The connection was lost before the answer arrived. Please try again.',
    projects: {},
}

// One socket for the whole app: the conversation survives leaving and
// re-entering the chat section.
let socket = null

// Protocol: the server sends {type: 'ready'} once the chat is open. Each
// message sent is answered with a stream of {type: 'delta', text} frames
// ({type: 'reset'} discards the text so far) closed by one
// {type: 'message' | 'error', response, projects} frame with the full answer.
export function connectChat(dispatch) {
    if (socket) return

    dispatch(setWsStatus('connecting'))
    const ws = new WebSocket(chatWsUrl)
    socket = ws

    ws.onmessage = (event) => {
        const frame = JSON.parse(event.data)
        if (frame.type === 'ready') dispatch(setWsStatus('ready'))
        else if (frame.type === 'delta') dispatch(appendWsDelta(frame.text))
        else if (frame.type === 'reset') dispatch(resetWsStream())
        else dispatch(finishWsMessage(frame))
    }

    ws.onclose = () => {
        if (socket === ws) socket = null
        dispatch(finishWsMessage(CONNECTION_LOST))
        dispatch(setWsStatus('offline'))
    }
}

export function sendChatMessage(dispatch, text) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false

    socket.send(text)
    dispatch(addWsMessage({ role: 'user', text }))
    dispatch(addWsMessage({ role: 'assistant', streaming: true, response: '', projects: {}, error: false }))
    return true
}

// Sends the question queued from another page once the chat can take it.
// Reads the store at call time, so calling it twice cannot send it twice.
export const sendQueuedQuestion = () => (dispatch, getState) => {
    const { pendingQuestion, status, messages } = getState().ws
    const answering = messages[messages.length - 1]?.streaming === true
    if (!pendingQuestion || status !== 'ready' || answering) return

    if (sendChatMessage(dispatch, pendingQuestion)) dispatch(clearWsQuestion())
}
