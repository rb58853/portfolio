import { Icon } from "@iconify/react/dist/iconify.js";
import { useLocation } from "react-router-dom";
import { SectionLink } from "../../routes/navigation";
import './styles/desktop.css'
import { usePreferences } from "../../preferences/preferencesContext";

export function ChatButton() {
    const { pathname } = useLocation()
    if (pathname === '/chat') return null

    return <SectionLink className='chatButton desktop' aria-label='Open the assistant'
        state={{ from: pathname }} to='/chat'>
        <Icon icon={'ci:chat'} />
    </SectionLink>
}

export function ThemeButton() {
    const { theme, toggleTheme } = usePreferences()
    const { pathname } = useLocation()

    return (
        <button
            className={`themeToggleButton ${pathname === '/chat' ? 'inChat' : ''}`}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            <Icon icon={theme === 'dark' ? 'line-md:moon-filled-alt-to-sunny-filled-loop-transition' : 'line-md:sunny-filled-loop-to-moon-filled-alt-loop-transition'} />
        </button>
    )
}
