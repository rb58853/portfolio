import socials from '../../environment/data/socials'
import projects from '../../environment/data/projects'

// Markdown the assistant's answers may render. The assistant answers in
// prose; if a reply ever slipped past the server's checks, code blocks still
// show as plain text and images are dropped (an image would make the browser
// load a URL the model chose). Raw HTML is never rendered.
export const ASSISTANT_MARKDOWN = {
    disallowedElements: ['pre', 'code', 'img'],
    unwrapDisallowed: true,
    skipHtml: true,
}

// Comparable form of an address: web and mailto only, no "www.", no trailing slash.
// A bare "www." address renders as http://, so http counts as the same page.
function linkKey(href) {
    try {
        const url = new URL(href)
        if (url.protocol === 'mailto:') return `mailto:${decodeURIComponent(url.pathname).toLowerCase()}`
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
        const path = decodeURIComponent(url.pathname).replace(/\/+$/, '')
        return `${url.host.replace(/^www\./, '')}${path}${url.search}`.toLowerCase()
    } catch {
        return null
    }
}

// Every address the site itself publishes: contact details and project links.
const PUBLISHED = new Set(
    [...Object.values(socials), ...Object.values(projects).flatMap((project) => [project.github, project.app])]
        .filter((href) => typeof href === 'string')
        .map(linkKey)
        .filter(Boolean)
)

export function isPublishedLink(href) {
    const key = typeof href === 'string' ? linkKey(href) : null
    return key !== null && PUBLISHED.has(key)
}

// Second line of defence behind the server's link check: a reply can only
// link to what the site publishes. Anything else shows as plain text.
export const ASSISTANT_COMPONENTS = {
    a: ({ node, href, children }) => isPublishedLink(href)
        ? <a href={href} target='_blank' rel='noreferrer'>{children}</a>
        : <span>{children}</span>,
}
