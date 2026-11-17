import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react/dist/iconify.js';
import './styles/desktop.css'
import './styles/mobile.css'

import AutoResizeTextarea from './utils/textArea/textArea'
import UserMessage from './chatComponents/message/userMessage';
import ServerMessage from './chatComponents/message/serverMessage';
import ShellPrompt from './chatComponents/message/shellPrompt';
import { connectChat, sendChatMessage, sendQueuedQuestion } from './core/socket';
import setSectionFunction from '../redux/sections/functions';
import { useSectionNavigate } from '../routes/navigation';
import { ThemeToggle } from '../components/bar/floatButtons';

const STATUS_LABEL = { idle: 'connecting', connecting: 'connecting', ready: 'online', offline: 'offline' }

// Questions offered as commands before the conversation starts
const SUGGESTIONS = [
    'What are you working on right now?',
    'Show me your computer vision projects',
    'Which technologies do you use most?',
    'How can I contact you?',
]

function Chat() {
    const { status, messages, pendingQuestion } = useSelector((state) => state.ws)
    const dispatch = useDispatch();
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (status === 'idle') connectChat(dispatch)
    }, [status, dispatch]);

    // One answer at a time: the next question waits until this one is written.
    const answering = messages[messages.length - 1]?.streaming === true

    // A question asked from a project, a skill or a role opens the conversation
    useEffect(() => {
        dispatch(sendQueuedQuestion())
    }, [pendingQuestion, status, answering, dispatch]);

    const sendMessage = () => {
        const text = query.trim()
        if (text === '' || answering) return
        if (sendChatMessage(dispatch, text)) setQuery('')
    };

    // A suggested question is sent as it is, under the same rule as typing it
    const canAsk = status === 'ready' && !answering
    const suggest = (text) => {
        if (canAsk) sendChatMessage(dispatch, text)
    }

    const retry = () => connectChat(dispatch)

    return <div onFocus={setSectionFunction(dispatch, 'chat')} className='chat'>
        <div className='chatWindow'>
            <ChatBar status={status} />
            <ChatHistory messages={messages} status={status} retry={retry}
                awaitingQuestion={pendingQuestion !== null && status !== 'offline'}
                canAsk={canAsk} suggest={suggest} />
            {(status !== 'offline' || messages.length > 0) &&
                <ChatComposer status={status} retry={retry} answering={answering}
                    sendMessage={sendMessage} query={query} setQuery={setQuery} />}
        </div>
    </div>
}

// Title bar of the terminal window
function ChatBar({ status }) {
    const go = useSectionNavigate()
    const location = useLocation()

    return <header className='chatBar'>
        <div className='chatBarContent'>
            <button className='chatBack' onClick={() => { go(location.state?.from || '/') }}>
                <Icon icon='codicon:arrow-left' />
                <span>Back</span>
            </button>
            <span className='chatBarTitle'>
                <Icon icon='codicon:terminal' aria-hidden='true' />
                <span aria-hidden='true'>visitor@rb58853: ~/assistant</span>
                <span className='srOnly'>Assistant</span>
            </span>
            <div className='chatBarActions'>
                <span className={`chatStatus ${status}`}>{STATUS_LABEL[status]}</span>
                <ThemeToggle className='inChat' />
            </div>
        </div>
    </header>
}

// Space kept between the last written line and the composer while following it
const FOLLOW_MARGIN = 64
// Roughly how long the view takes to reach where it is going. It moves like a
// critically damped spring: it picks up speed and brakes gently, never overshoots.
const GLIDE_SECONDS = 0.32
// A late frame (background tab) may not make the view leap
const MAX_FRAME_SECONDS = 0.05

function ChatHistory({ messages, status, retry, awaitingQuestion, canAsk, suggest }) {
    const scrollRef = useRef(null)
    const columnRef = useRef(null)
    // The view follows the conversation until the visitor scrolls, and then
    // stays wherever the visitor leaves it until the next question is sent.
    // It never takes the view back on its own: re-attaching near the resting
    // position fought small trackpad and touch scrolls, and the view jumped.
    const following = useRef(true)
    // A conversation restored from an earlier visit appears in place, without the glide
    const glide = useRef({ frame: 0, running: false, position: 0, velocity: 0, instant: messages.length > 0 })

    // Where the view rests: the current question at the top while its answer
    // fits below it, otherwise the last written line just above the composer.
    const restingPosition = useCallback(() => {
        const scroll = scrollRef.current
        const column = columnRef.current
        const questions = column.querySelectorAll('.chatRow.user')
        const question = questions[questions.length - 1]
        const answer = column.lastElementChild?.querySelector('.chatRowBody')
        if (!question || !answer) return null

        const origin = scroll.getBoundingClientRect().top - scroll.scrollTop
        const questionRect = question.getBoundingClientRect()

        // One pixel past the row's top edge tucks its hairline under the top strip
        const top = questionRect.top - origin + 1

        // The last answer keeps enough room under it for its question to get there
        const padding = parseFloat(getComputedStyle(column).paddingBottom)
        const room = `${Math.max(0, scroll.clientHeight - questionRect.height - padding + 1)}px`
        if (column.style.getPropertyValue('--chat-room') !== room) column.style.setProperty('--chat-room', room)

        const bottom = answer.getBoundingClientRect().bottom - origin + FOLLOW_MARGIN
        const limit = scroll.scrollHeight - scroll.clientHeight
        return Math.max(0, Math.min(limit, Math.max(top, bottom - scroll.clientHeight)))
    }, []);

    const settle = useCallback(() => {
        const state = glide.current
        if (state.running) return

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        let last = performance.now()
        // scrollTop only holds whole pixels, so the eased position is tracked apart
        state.position = scrollRef.current.scrollTop
        state.velocity = 0
        state.running = true

        const step = (now) => {
            const scroll = scrollRef.current
            const target = scroll && following.current ? restingPosition() : null
            if (target === null) {
                state.running = false
                return
            }

            const offset = state.position - target
            const arrived = Math.abs(offset) < 0.5 && Math.abs(state.velocity) < 4
            if (state.instant || reducedMotion || arrived) {
                scroll.scrollTop = target
                state.instant = false
                state.running = false
                return
            }

            const elapsed = Math.min((now - last) / 1000, MAX_FRAME_SECONDS)
            last = now
            const omega = 2 / GLIDE_SECONDS
            const x = omega * elapsed
            const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
            const pull = (state.velocity + omega * offset) * elapsed
            state.velocity = (state.velocity - omega * pull) * decay
            state.position = target + (offset + pull) * decay
            scroll.scrollTop = state.position
            state.frame = requestAnimationFrame(step)
        }
        state.frame = requestAnimationFrame(step)
    }, [restingPosition]);

    // Text being written, cards arriving, the window or the composer resizing
    useEffect(() => {
        const state = glide.current
        const observer = new ResizeObserver(settle)
        observer.observe(columnRef.current)
        observer.observe(scrollRef.current)
        return () => {
            observer.disconnect()
            cancelAnimationFrame(state.frame)
            state.running = false
        }
    }, [settle]);

    // A new question always takes the view back
    useEffect(() => {
        following.current = true
        settle()
    }, [messages.length, settle]);

    // Wheel, touch, keys or the scrollbar: the visitor takes over.
    const onUserScroll = () => {
        following.current = false
    }

    return <div className='chatScroll' ref={scrollRef}
        onWheel={onUserScroll} onTouchMove={onUserScroll} onKeyDown={onUserScroll}
        onPointerDown={(e) => { if (e.target === scrollRef.current) onUserScroll() }}>
        <div className='chatColumn chatHistory' ref={columnRef}>
            <ChatIntro offline={status === 'offline'} retry={retry} canAsk={canAsk} suggest={suggest}
                showSuggestions={messages.length === 0 && !awaitingQuestion} />
            {messages.map((message, index) => message.role === 'user'
                ? <UserMessage key={index} text={message.text} current={index >= messages.length - 2} />
                : <ServerMessage key={index} message={message} />)}
        </div>
    </div>
}

// When this visit opened the terminal, as a shell greets a new session
const OPENED = new Date().toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
})

// Session banner: stays at the top of the conversation, like a shell's welcome text
function ChatIntro({ offline, retry, canAsk, suggest, showSuggestions }) {
    return <div className='chatIntro'>
        <p className='chatMotd' aria-hidden='true'>Last login: {OPENED} on web</p>
        <h1 className='chatIntroTitle'>Ask me about my experience, projects or skills.</h1>
        <p className='chatIntroText'>
            An AI assistant answers on my behalf, using only what is published on this site.
        </p>

        {offline
            ? <div className='chatIntroOffline' role='status'>
                <p><span className='chatErrorTag'>error:</span> the assistant is offline right now. Try again in a moment, or use the contact details on the home page.</p>
                <button className='chatLink' onClick={retry}>Try again</button>
            </div>
            : showSuggestions && <div className='chatSuggestions'>
                <p className='chatSuggestionsLabel'># try one of these</p>
                {SUGGESTIONS.map((text) => (
                    <button key={text} type='button' className='chatSuggestion' disabled={!canAsk}
                        onClick={() => suggest(text)}>
                        <span className='chatSuggestionMark' aria-hidden='true'>$</span>
                        <span>{text}</span>
                    </button>
                ))}
            </div>}
    </div>
}

function ChatComposer({ status, retry, answering, sendMessage, query, setQuery }) {
    const ready = status === 'ready'

    return <footer className='chatComposer'>
        <div className='chatColumn chatComposerRow'>
            {status === 'offline'
                ? <div className='chatNotice'>
                    <span><span className='chatErrorTag'>error:</span> the assistant is offline.</span>
                    <button className='chatLink' onClick={retry}>Try again</button>
                </div>
                : <div className='chatField'>
                    <div className='chatInput'>
                        <ShellPrompt />
                        <AutoResizeTextarea query={query} setQuery={setQuery} sendMessage={sendMessage}
                            disabled={!ready} ariaLabel='Message to the assistant'
                            placeholder={ready ? 'ask me anything about my work' : 'connecting…'} />
                        <button className='chatSend' aria-label='Send message' title='Send (Enter)'
                            disabled={!ready || answering || query.trim() === ''}
                            onClick={() => { sendMessage() }}>
                            <Icon icon='codicon:newline' />
                        </button>
                    </div>
                    <p className='chatFootnote'>
                        <span># AI assistant answering on Raúl's behalf. Answers may contain mistakes.</span>
                        <span className='chatKeys' aria-hidden='true'><kbd>Enter</kbd> send · <kbd>Shift</kbd>+<kbd>Enter</kbd> new line</span>
                    </p>
                </div>}
        </div>
    </footer>
}

export default Chat
