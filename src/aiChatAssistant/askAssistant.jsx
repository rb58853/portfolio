import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { useLocation } from 'react-router-dom'
import { Icon } from '@iconify/react/dist/iconify.js'
import './styles/ask.css'
import { queueWsQuestion } from '../redux/websocket/wsSlice'
import { useSectionNavigate } from '../routes/navigation'

// What the site asks on the visitor's behalf, by where they were when they asked
export const assistantQuestions = {
    project: (project) => `Tell me about your project "${project.title}": what it does, what your part in it was and what you would highlight.`,
    skill: (skill) => `What is your experience with ${skill.name ?? skill.label}, and which projects or jobs show it?`,
    role: (job) => `Tell me about your time at ${job.company} as ${job.role}: what you built and what you achieved.`,
}

// Opens the chat and starts a conversation with `question`. The chat sends it
// itself once it is connected, so this works from any page.
export function useAskAssistant() {
    const dispatch = useDispatch()
    const go = useSectionNavigate()
    const { pathname } = useLocation()

    return useCallback((question) => {
        dispatch(queueWsQuestion(question))
        go('/chat', { from: pathname })
    }, [dispatch, go, pathname])
}

export function AskAssistant({ question, label = 'Ask the assistant', onAsk, className = '' }) {
    const ask = useAskAssistant()

    return (
        <button type='button' className={`askAssistant ${className}`}
            onClick={() => {
                onAsk?.()
                ask(question)
            }}
        >
            <Icon icon='ci:chat' />
            <span>{label}</span>
        </button>
    )
}
