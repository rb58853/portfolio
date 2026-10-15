// Runs after `react-scripts build`. Writes one HTML file per route into build/ with its own
// title, description and canonical URL, plus the page text inside #root, so search engines
// and link previews (LinkedIn, WhatsApp, Slack...) get real content without running
// JavaScript. React replaces that text when the app mounts. Also writes build/sitemap.xml.
// nginx serves /projects from build/projects.html (see nginx.conf).
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import React from 'react'
import server from 'react-dom/server'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BUILD = path.join(ROOT, 'build')
const DATA = path.join(ROOT, 'src/environment/data')
const NAME = 'Raúl Beltrán Gómez'

// The data files are ES modules in a CommonJS package and import nothing, so they load as data: URLs.
async function loadData(file) {
    const source = await readFile(path.join(DATA, file), 'utf8')
    return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

const [{ default: projects }, experience, personal, { default: skills }, { default: languages }, { default: socials }] =
    await Promise.all(['projects.js', 'experience.js', 'personal.js', 'skills.js', 'languages.js', 'socials.js'].map(loadData))

const escape = (value) => String(value).replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)

// Project descriptions sit under an <h2>, so their own headings move one level down.
const markdown = (text, components) => server.renderToStaticMarkup(
    React.createElement(Markdown, { remarkPlugins: [remarkGfm], components }, text))
const nested = { h1: 'h3', h2: 'h3', h3: 'h4' }

const list = (items) => `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`
const link = (href, text) => `<a href="${escape(href)}">${escape(text)}</a>`

const bySkill = (dic) => Object.values(dic)
    .sort((a, b) => b.skill - a.skill)
    .map((item) => escape(capitalize(item.name ?? item.label)))

const nav = `<nav>${[
    ['/', 'Home'], ['/projects', 'Projects'], ['/experience', 'Experience'],
    ['/skills', 'Skills & languages'], ['/about', 'About'], ['/chat', 'Chat'],
].map(([href, text]) => link(href, text)).join('')}</nav>`

const home = `
    <h1>Hello, I'm ${NAME}. I'm a Computer Scientist.</h1>
    <p>Computer Vision &amp; Software Engineer in Madrid, Spain · rb58853</p>
    <p>${escape(experience.experienceIntro)}</p>
    <h2>Explore</h2>
    <p>${link('/projects', 'View my work')}: real projects from my studies and from work, with the technical detail behind each one.</p>
    <p>${link('/chat', 'Chat with me')}: an AI assistant that answers questions about my experience, projects and skills.</p>
    <h2>Contact</h2>
    ${list([
        link(socials.cv, 'Curriculum vitae'),
        `LinkedIn: ${link(socials.linkedIn, 'rb58853')}`,
        `GitHub: ${link(socials.github, 'rb58853')}`,
        `PyPI: ${link(socials.pypi, 'rb58853')}`,
        `Telegram: ${link(socials.telegram, '@rb58853')}`,
        'Madrid, Spain',
    ])}`

const projectsPage = `
    <h1>Projects</h1>
    ${Object.values(projects).map((project) => `
    <article>
        <h2>${escape(project.title)}</h2>
        ${markdown(project.description, nested)}
        ${list([
            `Areas: ${escape(project.skills.filter(Boolean).join(', '))}`,
            ...(project.languages ? [`Languages: ${escape(project.languages.join(', '))}`] : []),
            ...Object.entries(project.features ?? {}).map(([key, value]) => `${escape(capitalize(key))}: ${escape(value)}`),
            ...(project.github ? [link(project.github, 'Source code')] : []),
            ...(project.sitie ? [link(project.sitie, 'Live site')] : []),
            ...(project.paper ? [link(project.paper, 'Paper (PDF)')] : []),
        ])}
    </article>`).join('')}`

const experiencePage = `
    <h1>Computer vision, applied AI and scalable software, built for production.</h1>
    <p>${escape(experience.experienceIntro)}</p>
    ${experience.workExperience.map((job) => `
    <article>
        <h2>${escape(job.role)} · ${escape(job.company)}</h2>
        <p>${escape(job.period)} · ${escape(job.location)}</p>
        <p>${escape(job.summary)}</p>
        ${list(job.achievements.map(escape))}
        ${job.projects ? `<h3>Selected work</h3>${list(job.projects.map((item) =>
            `<strong>${escape(item.name)}</strong>: ${escape(item.description)}`))}` : ''}
        <p>Stack: ${escape(job.stack.join(', '))}</p>
    </article>`).join('')}
    <h2>Education</h2>
    <p>${escape(experience.education.degree)}, ${escape(experience.education.institution)}, ${escape(experience.education.location)}. ${escape(experience.education.date)}.</p>
    ${list(experience.education.coursework.map(escape))}
    <h2>Focus areas</h2>
    ${list(experience.focusAreas.map(escape))}`

const skillsPage = `
    <h1>Skills &amp; languages</h1>
    <h2>Programming languages</h2>
    ${list(bySkill(languages))}
    <h2>Skills</h2>
    ${list(bySkill(skills))}`

// Phone and email stay out of the static HTML, away from address harvesters that skip JavaScript.
const aboutPage = `
    <h1>About ${NAME}</h1>
    ${[personal.aboutMe, personal.studyFields, personal.know, personal.languages].map((text) => markdown(text)).join('')}`

const chatPage = `
    <h1>Ask me about my experience, projects or skills.</h1>
    <p>This is an AI assistant that answers on my behalf, using what is published on this site. It needs JavaScript.</p>`

// The home page keeps the title and description written in public/index.html.
const pages = [
    { route: '/', body: home },
    {
        route: '/projects', title: 'Projects', body: projectsPage,
        description: 'Selected work by Raúl Beltrán: computer vision for a robotic dairy cell, the Fastchat-MCP client, image retrieval with SAM and CLIP, a Steam game and more.',
    },
    {
        route: '/experience', title: 'Experience', body: experiencePage,
        description: 'Work history of Raúl Beltrán: computer vision and software for industrial robotics, MCP servers and LLM assistants, conversational AI backends and Unity games.',
    },
    {
        route: '/skills', title: 'Skills & languages', body: skillsPage,
        description: 'Languages, frameworks and fields Raúl Beltrán works with, from Python, PyTorch and computer vision to LLMs, MCP, FastAPI, React, C# and Rust.',
    },
    {
        route: '/about', title: 'About', body: aboutPage,
        description: 'Computer scientist from the University of Havana, based in Madrid: background, professional interests, study fields, knowledge areas and languages.',
    },
    {
        route: '/chat', title: 'Chat', body: chatPage,
        description: 'Ask an AI assistant about the experience, projects and skills of Raúl Beltrán. It answers from what is published on this portfolio.',
    },
]

// Replaces the attribute value that follows `prefix`, failing the build if index.html no longer has it.
function setValue(html, prefix, value) {
    const start = html.indexOf(prefix)
    if (start === -1) throw new Error(`prerender: ${prefix} not found in build/index.html`)
    const from = start + prefix.length
    return html.slice(0, from) + escape(value) + html.slice(html.indexOf('"', from))
}

const template = await readFile(path.join(BUILD, 'index.html'), 'utf8')
const canonical = template.match(/<link rel="canonical" href="([^"]+)"/)
if (!canonical) throw new Error('prerender: canonical link not found in build/index.html')
const origin = new URL(canonical[1]).origin

const EMPTY_ROOT = '<div id="root"></div>'
if (!template.includes(EMPTY_ROOT)) throw new Error('prerender: build/index.html has no empty #root, run react-scripts build first')

for (const page of pages) {
    let html = template
    if (page.title) {
        const title = `${page.title} · ${NAME}`
        const url = origin + page.route
        html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${escape(title)}</title>`)
        html = setValue(html, '<link rel="canonical" href="', url)
        html = setValue(html, '<meta property="og:url" content="', url)
        html = setValue(html, '<meta property="og:title" content="', title)
        html = setValue(html, '<meta name="description" content="', page.description)
        html = setValue(html, '<meta property="og:description" content="', page.description)
    }
    html = html.replace(EMPTY_ROOT, () => `<div id="root"><main class="prerendered">${nav}${page.body}</main></div>`)

    const file = page.route === '/' ? 'index.html' : `${page.route.slice(1)}.html`
    await writeFile(path.join(BUILD, file), html)
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((page) => `  <url><loc>${origin}${page.route}</loc></url>`).join('\n')}
</urlset>
`
await writeFile(path.join(BUILD, 'sitemap.xml'), sitemap)

console.log(`Prerendered ${pages.length} routes and sitemap.xml for ${origin}`)
