import { memo, useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './styles/desktop.css'
import './styles/mobile.css'
import ProjectMessage from '../projectMessage/projectMessage';
import projects from '../../../environment/data/projects';
import { ProjectWindow } from '../../../components/projects/projects';

const markdownComponents = {
    a: ({ node, children, ...props }) => <a {...props} target='_blank' rel='noreferrer'>{children}</a>,
}

// Pace at which an answer is written on screen. The model delivers it much
// faster and in bursts; text that outruns the eye is uncomfortable to follow.
const REVEAL_CHARS_PER_SECOND = 80
// A frame that arrives late (background tab) may not dump the time it missed.
const MAX_FRAME_MS = 100

function useReveal(text, animate) {
    const [shown, setShown] = useState(animate ? 0 : text.length)
    const length = useRef(text.length)
    length.current = text.length
    const pending = shown < text.length

    // The server may discard what it streamed and start the answer again
    useEffect(() => {
        if (shown > text.length) setShown(text.length)
    }, [shown, text.length]);

    useEffect(() => {
        if (!pending) return undefined

        let frame
        let last = performance.now()
        let budget = 0
        const tick = (now) => {
            budget += Math.min(now - last, MAX_FRAME_MS) * REVEAL_CHARS_PER_SECOND / 1000
            last = now
            const step = Math.floor(budget)
            if (step > 0) {
                budget -= step
                setShown((count) => Math.min(length.current, count + step))
            }
            frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [pending]);

    return text.slice(0, shown)
}

// Keeps half-written markdown from flashing its raw syntax while it is revealed.
function settle(partial) {
    // A block marker alone on the last line ("-", "2.", "##") is not a list or a heading yet
    let text = partial.replace(/\n[ \t]*(?:[-*+]|#{1,6}|\d+[.)]?)?[ \t]*$/, '')

    // A link still being written shows its label only
    const link = text.lastIndexOf('[')
    if (link !== -1 && !/^\[[^\]]*\]\([^)]*\)/.test(text.slice(link))) {
        text = text.slice(0, link) + text.slice(link + 1).split(']')[0]
    }
    const autolink = text.lastIndexOf('<')
    if (autolink !== -1 && !text.includes('>', autolink)) text = text.slice(0, autolink)

    // Emphasis and code opened but not closed yet
    text = text.replace(/\*+$/, '')
    if ((text.match(/\*\*/g) || []).length % 2 === 1) text += '**'
    if ((text.match(/`/g) || []).length % 2 === 1) text += '`'
    return text
}

function ServerMessage({ message }) {
    const [windowProject, setWindowProject] = useState(false)
    const [project, setProject] = useState(null)

    // Written in front of the visitor, as opposed to restored from an earlier visit.
    const live = useRef(
        message.streaming && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ).current

    const revealed = useReveal(message.response, live)
    const written = !message.streaming && revealed.length === message.response.length
    const text = written ? message.response : settle(revealed)
    const cards = Object.keys(message.projects).filter((key) => projects[key])

    const openProject = (key) => {
        if (windowProject) return
        setProject(projects[key])
        setWindowProject(true)
    }

    return (
        <article className={`chatRow assistant ${message.error ? 'error' : ''}`}>
            <span className='chatRowLabel'>Raúl <em>AI</em></span>

            <div className='chatRowBody'>
                {text.trim() === '' && !written
                    ? <div className='chatDots' aria-label='Writing'><span /><span /><span /></div>
                    : <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}
                        className={`chatAnswer ${written ? '' : 'typing'}`}>
                        {text}
                    </Markdown>}

                {written && cards.length > 0 &&
                    <div className={`chatCards ${live ? 'live' : ''}`}>
                        {cards.map((key, index) =>
                            <ProjectMessage key={key} index={index} project={projects[key]}
                                comment={message.projects[key]} onOpen={() => openProject(key)} />)}
                    </div>}
            </div>

            {project &&
                <ProjectWindow project={project} setWindowProject={setWindowProject} windowProject={windowProject} />}
        </article>
    )
}

export default memo(ServerMessage)
