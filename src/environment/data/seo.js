// Title and description of each route. scripts/prerender.mjs writes them into the static HTML
// of each page, and App keeps them in sync when the app navigates. Google cuts titles at about
// 60 characters and descriptions at about 155, so the keywords that matter go first.
const seo = {
    '/': {
        title: 'Raúl Beltrán Gómez · Computer Scientist & AI Developer',
        description: 'Raúl Beltrán Gómez, computer scientist, AI developer and programmer in Madrid. I build computer vision (artificial vision) models and scalable software.',
    },
    '/projects': {
        title: 'Computer Vision & AI Projects · Raúl Beltrán Gómez',
        description: 'Projects by Raúl Beltrán Gómez: computer vision for a robotic dairy cell, image retrieval with SAM and CLIP, the Fastchat-MCP LLM client, a Steam game and more.',
    },
    '/experience': {
        title: 'AI & Computer Vision Experience · Raúl Beltrán Gómez',
        description: 'Work history of Raúl Beltrán Gómez, AI and computer vision developer: detection models and software for industrial robotics, MCP servers, LLM assistants and games.',
    },
    '/skills': {
        title: 'Programming Skills & Languages · Raúl Beltrán Gómez',
        description: 'Programming languages and skills of Raúl Beltrán Gómez: Python, PyTorch and computer vision, machine learning, LLMs and MCP, FastAPI, React, C# and Rust.',
    },
    '/about': {
        title: 'About Raúl Beltrán Gómez · Computer Scientist',
        description: 'Raúl Beltrán Gómez, computer scientist from the University of Havana based in Madrid: background, interest in computer vision and AI, study fields and languages.',
    },
    '/chat': {
        title: 'Chat with the AI Assistant · Raúl Beltrán Gómez',
        description: 'Ask an AI assistant about the experience, projects and skills of Raúl Beltrán Gómez. It answers from what is published on this portfolio.',
    },
}

export default seo
