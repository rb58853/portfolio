// Skills shown on the Skills page, strongest first. Icons are monochrome: brand
// marks from simple-icons for technologies, tabler glyphs for disciplines.
// backend/knowledge/skills.yaml mirrors this list for the assistant.
const skills =
{
    llmAi: {
        label: 'LLMs & Applied AI',
        name: 'LLMs and applied AI',
        info: 'Assistants that connect language models with external systems: prompt design, agents, retrieval-augmented generation, tool orchestration, evaluation and production integration.',
        skill: 97,
        icon: 'tabler:sparkles'
    },

    mcp: {
        label: 'MCP',
        name: 'the Model Context Protocol (MCP)',
        info: 'Servers and clients for the Model Context Protocol, connecting LLM assistants with tools and business workflows. Author of Fastchat-MCP.',
        skill: 95,
        icon: 'simple-icons:modelcontextprotocol'
    },

    daa: {
        label: 'Algorithms',
        name: 'algorithm design and analysis',
        info: 'Algorithm design and complexity analysis, a core strength from my Computer Science degree at the University of Havana.',
        skill: 95,
        icon: 'tabler:binary-tree-2'
    },

    unity: {
        label: 'Unity',
        info: 'Gameplay systems and tooling in C#, including the commercial deck-building roguelike Arcane Ascent, released on Steam Early Access.',
        skill: 90,
        icon: 'simple-icons:unity'
    },

    computerVision: {
        label: 'Computer Vision',
        name: 'computer vision',
        info: 'Computer vision for production systems: object and keypoint detection, OCR, camera calibration and pixel-to-robot coordinate mapping, with models deployed on GPU through ONNX Runtime.',
        skill: 88,
        icon: 'tabler:scan-eye'
    },

    machineLearning: {
        label: 'Machine Learning',
        name: 'machine learning',
        info: 'Training, evaluation and deployment of models: detection and pose models for industrial robots, multimodal image retrieval and audio genre classification.',
        skill: 85,
        icon: 'tabler:brain'
    },

    pytorch: {
        label: 'PyTorch',
        info: 'Detection and pose models, hyperparameter search with Optuna and export to ONNX for low-latency inference.',
        skill: 82,
        icon: 'simple-icons:pytorch'
    },

    fastapi: {
        label: 'FastAPI',
        info: 'REST and WebSocket backends in Python, with API key management, authorisation layers and secure request handling.',
        skill: 80,
        icon: 'simple-icons:fastapi'
    },

    irs: {
        label: 'Information Retrieval',
        name: 'information retrieval',
        info: 'Search and retrieval systems: multimodal image retrieval with SAM segmentation and CLIP embeddings, and product retrieval with Typesense for an e-commerce assistant.',
        skill: 79,
        icon: 'tabler:file-search'
    },

    reactJs: {
        label: 'React',
        name: 'React',
        info: 'User interfaces for web applications and internal tools.',
        skill: 75,
        icon: 'simple-icons:react'
    },

    docker: {
        label: 'Docker',
        info: 'Containerised development and deployment of backend services.',
        skill: 60,
        icon: 'simple-icons:docker'
    },

    ds: {
        label: 'Distributed Systems',
        name: 'distributed systems',
        info: 'Distributed services, such as a distributed FTP system with leader election (Bully algorithm) that keeps serving when a node fails.',
        skill: 55,
        icon: 'tabler:topology-star-3'
    },
}

export default skills
