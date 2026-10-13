import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react/dist/iconify.js';
import './styles/desktop.css'
import './styles/mobile.css'

import AutoResizeTextarea from './utils/textArea/textArea'
import UserMessage from './chatComponents/message/userMessage';
import ServerMessage from './chatComponents/message/serverMessage';
import { connectChat, sendChatMessage, sendQueuedQuestion } from './core/socket';
import setSectionFunction from '../redux/sections/functions';
import { useSectionNavigate } from '../routes/navigation';

const STATUS_LABEL = { idle: 'Connecting', connecting: 'Connecting', ready: 'Online', offline: 'Offline' }

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

    const retry = () => connectChat(dispatch)

    return <div onFocus={setSectionFunction(dispatch, 'chat')} className='chat'>
        <ChatBar status={status} />
        <ChatHistory messages={messages} status={status} retry={retry}
            awaitingQuestion={pendingQuestion !== null && status !== 'offline'} />
        {(status !== 'offline' || messages.length > 0) &&
            <ChatComposer status={status} retry={retry} answering={answering}
                sendMessage={sendMessage} query={query} setQuery={setQuery} />}
    </div>
}

function ChatBar({ status }) {
    const go = useSectionNavigate()
    const location = useLocation()

    return <header className='chatBar'>
        <div className='chatBarContent'>
            <button className='chatBack' onClick={() => { go(location.state?.from || '/') }}>
                <Icon icon='mdi:arrow-left' />
                <span>Back</span>
            </button>
            <span className='chatBarTitle'>Assistant</span>
            <span className={`chatStatus ${status}`}>{STATUS_LABEL[status]}</span>
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
// How close to its resting position the view must be to follow the answer again
const REATTACH_DISTANCE = 48

function ChatHistory({ messages, status, retry, awaitingQuestion }) {
    const scrollRef = useRef(null)
    const columnRef = useRef(null)
    // The view follows the conversation until the visitor scrolls away to read
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

    // Wheel, touch or the scrollbar: the visitor takes over, unless that left
    // the view where it would rest anyway.
    const onUserScroll = () => {
        following.current = false
        requestAnimationFrame(() => {
            const target = scrollRef.current ? restingPosition() : null
            if (target === null || Math.abs(target - scrollRef.current.scrollTop) > REATTACH_DISTANCE) return
            following.current = true
            settle()
        })
    }

    return <div className='chatScroll' ref={scrollRef}
        onWheel={onUserScroll} onTouchMove={onUserScroll} onKeyDown={onUserScroll}
        onScroll={() => { if (!following.current) onUserScroll() }}
        onPointerDown={(e) => { if (e.target === scrollRef.current) onUserScroll() }}>
        <div className='chatColumn chatHistory' ref={columnRef}>
            {messages.length === 0 && !awaitingQuestion &&
                <ChatIntro offline={status === 'offline'} retry={retry} />}
            {messages.map((message, index) => message.role === 'user'
                ? <UserMessage key={index} text={message.text} current={index >= messages.length - 2} />
                : <ServerMessage key={index} message={message} />)}
        </div>
    </div>
}

function ChatIntro({ offline, retry }) {
    return <div className='chatIntro'>
        <span className='chatEyebrow'>Assistant</span>
        <h1 className='chatIntroTitle'>
            {offline ? 'The assistant is offline right now.' : 'Ask me about my experience, projects or skills.'}
        </h1>
        <p className='chatIntroText'>
            {offline
                ? 'Try again in a moment, or use the contact details on the home page.'
                : 'This is an AI assistant that answers on my behalf, using what is published on this site.'}
        </p>
        {offline && <button className='chatLink' onClick={retry}>Try again</button>}
    </div>
}

function ChatComposer({ status, retry, answering, sendMessage, query, setQuery }) {
    const ready = status === 'ready'

    return <footer className='chatComposer'>
        <div className='chatColumn chatComposerRow'>
            <span className='chatRowLabel'>You</span>
            {status === 'offline'
                ? <div className='chatNotice'>
                    <span>The assistant is offline.</span>
                    <button className='chatLink' onClick={retry}>Try again</button>
                </div>
                : <div className='chatField'>
                    <div className='chatInput'>
                        <AutoResizeTextarea query={query} setQuery={setQuery} sendMessage={sendMessage}
                            disabled={!ready} placeholder={ready ? 'Write a message' : 'Connecting'} />
                        <button className='chatSend' aria-label='Send message'
                            disabled={!ready || answering || query.trim() === ''}
                            onClick={() => { sendMessage() }}>
                            <Icon icon='mdi:arrow-up' />
                        </button>
                    </div>
                    <p className='chatFootnote'>AI assistant answering on Raúl's behalf. Answers may contain mistakes.</p>
                </div>}
        </div>
    </footer>
}

export default Chat
