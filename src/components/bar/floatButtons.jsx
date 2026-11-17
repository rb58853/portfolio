import { Icon } from "@iconify/react/dist/iconify.js";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { SectionLink } from "../../routes/navigation";
import './styles/desktop.css'
import { usePreferences } from "../../preferences/preferencesContext";
import { sectionFiles } from "./bar";

export function ChatButton() {
    const { pathname } = useLocation()
    if (pathname === '/chat') return null

    return <SectionLink className='chatButton desktop' aria-label='Open the assistant' title='Open the assistant'
        state={{ from: pathname }} to='/chat'>
        <Icon icon={'codicon:terminal'} />
    </SectionLink>
}

export function ThemeToggle({ className = '' }) {
    const { theme, toggleTheme } = usePreferences()

    return (
        <button
            className={`themeToggleButton ${className}`}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            <Icon icon={theme === 'dark' ? 'line-md:moon-filled-alt-to-sunny-filled-loop-transition' : 'line-md:sunny-filled-loop-to-moon-filled-alt-loop-transition'} />
        </button>
    )
}

// The assistant draws its own toggle in the terminal's title bar.
export function ThemeButton() {
    const { pathname } = useLocation()
    if (pathname === '/chat') return null
    return <ThemeToggle className='floating' />
}

// Editor status bar along the bottom edge (wide screens only).
export function StatusBar() {
    const { pathname } = useLocation()
    const section = useSelector((state) => state.section).section
    const status = useSelector((state) => state.ws).status
    if (pathname === '/chat') return null

    const language = sectionFiles[section]?.language ?? 'Plain Text'

    return <footer className='statusBar desktop'>
        <div className='statusGroup'>
            <span className='statusItem statusRemote' aria-hidden='true'>
                <Icon icon='codicon:remote' /> rb58853
            </span>
            <span className='statusItem' aria-hidden='true'>
                <Icon icon='codicon:source-control' /> main
            </span>
            <span className='statusItem' aria-hidden='true'>
                <Icon icon='codicon:error' /> 0 <Icon icon='codicon:warning' /> 0
            </span>
        </div>

        <div className='statusGroup'>
            <SectionLink className='statusItem statusLink' to='/chat' state={{ from: pathname }}>
                <Icon icon='codicon:terminal' aria-hidden='true' /> Ask the assistant
                {status === 'ready' && <span className='statusDot' aria-hidden='true' />}
            </SectionLink>
            <span className='statusItem' aria-hidden='true'>{language}</span>
            <span className='statusItem' aria-hidden='true'>UTF-8</span>
            <span className='statusItem' aria-hidden='true'>
                <Icon icon='codicon:location' /> Madrid, ES
            </span>
        </div>
    </footer>
}
