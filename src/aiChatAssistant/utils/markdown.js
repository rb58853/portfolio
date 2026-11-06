// Markdown the assistant's answers may render. The assistant answers in
// prose; if a reply ever slipped past the server's checks, code blocks still
// show as plain text and images are dropped (an image would make the browser
// load a URL the model chose). Raw HTML is never rendered.
export const ASSISTANT_MARKDOWN = {
    disallowedElements: ['pre', 'code', 'img'],
    unwrapDisallowed: true,
    skipHtml: true,
}
