import { useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

// History model: [previous page] -> Home -> current section.
// Back from any section lands on Home, and back from Home leaves the site.
const HOME = '/'

export function useSectionNavigate() {
    const navigate = useNavigate()
    const location = useLocation()

    return useCallback((to, state = {}) => {
        if (to === location.pathname) return

        if (to === HOME) {
            // Home sits right below this entry: go back to it instead of stacking a second Home.
            if (location.state?.overHome) navigate(-1)
            else navigate(HOME, { replace: true })
            return
        }

        navigate(to, { replace: location.pathname !== HOME, state: { ...state, overHome: true } })
    }, [navigate, location])
}

export function SectionLink({ to, state, onClick, ...props }) {
    const go = useSectionNavigate()

    return <Link {...props} to={to}
        onClick={(event) => {
            onClick?.(event)
            const plainClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
            if (event.defaultPrevented || !plainClick) return

            event.preventDefault()
            go(to, state)
        }}
    />
}
