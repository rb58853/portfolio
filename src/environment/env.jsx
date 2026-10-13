// Chat WebSocket of the assistant backend. In production nginx proxies /api/ to
// the backend container on the same origin; in development it is the local
// uvicorn started from backend/.
const chatPath = '/api/v1/chat'
const sameOriginChatUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}${process.env.PUBLIC_URL}${chatPath}`

export const chatWsUrl = process.env.REACT_APP_CHAT_WS_URL
    || (process.env.NODE_ENV === 'development' ? `ws://localhost:8787${chatPath}` : sameOriginChatUrl)

const env = {
    boxProjectBigMinWidth: 300,
    boxProjectMinWidth: 250,
    boxProjectBigMinWidthMobile: 200,
    boxProjectMinWidthMobile: 180,
    mode: 'dark',
    flagColors: ['rgb(143, 72, 72)', ' rgb(81, 121, 87)', 'rgb(65, 45, 136)', ' rgb(206, 180, 36)']
}


export default env
