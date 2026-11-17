import { isPublishedLink } from './markdown'

// Links the assistant's knowledge contains: all of them must stay clickable.
const published = [
    'https://github.com/rb58853',
    'https://github.com/rb58853/fastchat-mcp',
    'https://github.com/maux96/distributed-ftp',
    'https://github.com/rb58853/rb58853/raw/main/assets/Raul%20Beltran%20Gomez%20cv.pdf',
    'https://t.me/rb58853',
    'https://wa.me/34642581503',
    'https://www.linkedin.com/in/rb58853/',
    'http://www.linkedin.com/in/rb58853',
    'mailto:rb58853@gmail.com',
]

// What a reply that slipped past the server could make the browser open.
const foreign = [
    'https://book.rb58853-hr.example',
    'http:calendly.example/rb58853',
    'https://github.com.evil.example/rb58853',
    'https://evil.example/https://github.com/rb58853',
    '//evil.example',
    'irc://evil.example',
    'mailto:jobs@evil.example',
    'javascript:alert(1)',
    '',
    undefined,
]

test.each(published)('keeps the published link %s', (href) => {
    expect(isPublishedLink(href)).toBe(true)
})

test.each(foreign)('drops the foreign link %s', (href) => {
    expect(isPublishedLink(href)).toBe(false)
})
