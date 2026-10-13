export const experienceIntro = 'From computer vision that guides industrial robots on the plant floor to LLM assistants connected to business systems. I build AI, backend and tooling that has to work reliably outside the lab.'

export const experienceStats = [
    { label: 'Roles', value: '4' },
    { label: 'Core focus', value: 'AI + Vision' },
    { label: 'Based in', value: 'Spain' },
]

export const workExperience = [
    {
        company: 'Promart Automatizaciones',
        role: 'Computer Vision, Machine Learning and Software Developer',
        location: 'Spain · On-site and plant commissioning',
        period: 'Jun 2026 - Present',
        type: 'Industrial AI',
        current: true,
        summary: 'Build the computer vision, machine learning and software platform behind a robotic cell for the dairy industry, from model training and camera calibration to APIs, desktop tooling, simulators and on-site validation.',
        achievements: [
            'Built the detection models for a robotic teat-sealing cell on rotary milking parlours: RF-DETR teat detection finding 99.4% of teats on the test set, and a proprietary pose model for leg posture that gates robot entry.',
            'Cut inference latency to 7.7 ms average with 3x lower jitter by moving models to ONNX Runtime on GPU, and packaged them with embedded contracts and golden tests for the production vision program.',
            'Created the data and tooling platform around the models: an S3 gateway with presigned transfers, Tauri and Rust desktop apps, an Android field-capture app and operator dashboards.',
            'Built the monitoring and control platform for the robot of the cell: a C# API of about 100 endpoints with a typed client generated from its OpenAPI contract, a React and Tauri desktop app with separate read-only and controller zones and continuous servo-effort telemetry with remote monitoring.',
            'Developed simulators that run the cell end to end without hardware: a control-logic simulator validated against the real controller across 637 variables, and a robot simulator that transpiles the production robot programs to Python.',
        ],
        projects: [
            {
                name: 'Teat detection platform',
                description: 'End-to-end pipeline for udder and teat detection: capture, labeling, augmentation, multi-architecture training, Optuna search, model registry and statistical reports.',
                stack: ['RF-DETR', 'PyTorch', 'FastAPI', 'Tauri'],
            },
            {
                name: 'Leg posture model',
                description: 'Keypoint and box model that classifies hind-leg posture with anatomical checks and temporal smoothing, erring on the side of blocking the robot.',
                stack: ['PyTorch', 'ONNX Runtime', 'CUDA'],
            },
            {
                name: 'Camera-to-robot calibration',
                description: 'Pixel-to-millimetre calibration with depth-aware homography, automated calibration runs and reusable profiles.',
                stack: ['OpenCV', 'NumPy', 'PyQt6'],
            },
            {
                name: 'Robot telemetry and control',
                description: 'API and desktop app over the robot controller: status, jobs, motion and files behind three access levels, servo-effort telemetry by tool position, cloud sync and a remote client app.',
                stack: ['C#', '.NET', 'React', 'Tauri', 'Rust'],
            },
            {
                name: 'Cell simulators',
                description: 'Simulators that stand in for the physical hardware: a control-logic editor with a cyclic runtime, and a transpiler that runs the production robot programs in Python with a step debugger.',
                stack: ['Python', 'PySide6', 'PyQt6'],
            },
        ],
        stack: ['Python', 'PyTorch', 'RF-DETR', 'ONNX Runtime', 'OpenCV', 'FastAPI', 'C#', '.NET', 'React', 'Tauri', 'Rust', 'S3'],
    },
    {
        company: 'Cogitia',
        role: 'MCP Protocol, Large Language Models, Chatbots and REST API Developer',
        location: 'Havana, Cuba · Remote for Madrid, Spain',
        period: 'May 2025 - Feb 2026',
        type: 'Enterprise AI',
        icon: 'mdi:robot-excited-outline',
        summary: 'Designed and maintained MCP-based systems for enterprise automation, connecting LLM-powered assistants with secure business workflows and extensible backend services.',
        achievements: [
            'Developed and extended MCP servers and clients, including both proprietary and open-source components, with robust prompt and tool design practices.',
            'Implemented secure authentication flows, keeping the architecture configurable, extensible, and production-ready.',
            'Built automation modules for business data, calendar operations, internal queries, and process orchestration through LLM-driven interactions.',
            'Created NLP solutions that converted natural-language audio inputs into business templates and structured documents while optimizing API performance and integration reliability.',
        ],
        stack: ['MCP', 'LLMs', 'REST APIs', 'NLP', 'Automation'],
    },
    {
        company: 'Word Games',
        role: 'Game Developer, Development Team',
        location: 'Havana, Cuba · Remote for Bogotá, Colombia',
        period: 'Oct 2024 - May 2025',
        type: 'Game Development',
        icon: 'mdi:controller-classic-outline',
        summary: 'Worked on gameplay engineering and AI-assisted language systems for commercial game development, covering both shipping features and experimental generation tooling.',
        achievements: [
            'Led the full programming implementation of Arcane Ascent, a deck-building roguelike released on Steam Early Access, covering gameplay systems and Unity engine functionality.',
            'Integrated native Steam capabilities such as achievements and persistence flows, improving publication readiness and overall player experience.',
            'Built an automated language generation system using NLP and OpenAI to create new in-game languages in real time.',
            'Implemented a robust JSON-based communication layer between Python and Unity to import and export generated language data dynamically.',
        ],
        stack: ['Unity', 'C#', 'Python', 'OpenAI', 'NLP', 'Steam'],
    },
    {
        company: 'Devman',
        role: 'NLP, Chatbot and API REST Developer, Backend Development Team',
        location: 'Havana, Cuba · Remote for Madrid, Spain',
        period: 'Apr 2024 - Oct 2024',
        type: 'Backend + Conversational AI',
        icon: 'mdi:server-network-outline',
        summary: 'Architected backend and conversational systems for e-commerce, combining product retrieval, NLP, secure APIs, and real-time communication.',
        achievements: [
            'Led the development of an enterprise chatbot assistant for e-commerce platforms using OpenAI-driven NLP and a Typesense-based product retrieval layer.',
            'Improved product discovery and customer interaction flows by connecting natural-language queries with structured catalog search.',
            'Designed a FastAPI REST architecture with API key management, authorization layers, and secure request handling.',
            'Implemented WebSocket communication for real-time chat experiences between customers and the assistant.',
        ],
        stack: ['FastAPI', 'OpenAI', 'Typesense', 'WebSockets', 'Auth', 'E-commerce'],
    },
]

export const education = {
    institution: 'University of Havana',
    degree: 'Bachelor of Computer Science',
    location: 'Havana, Cuba',
    date: 'Completed academic program in Jan 2024',
    coursework: [
        'Design and Analysis of Algorithms',
        'Data Structures and Algorithms',
        'Artificial Intelligence and Machine Learning',
        'Information Retrieval Systems',
        'Compilers',
        'Operating Systems',
        'Databases and Software Engineering',
        'Distributed Systems',
        'Networks',
        'Language Theory',
        'Graph Theory',
        'Number Theory',
        'Algebra',
    ],
}

export const focusAreas = [
    'Computer vision and deep learning',
    'Scalable software and data platforms',
    'MCP and agent tooling',
    'LLM product integration',
    'Chatbots and NLP',
    'API and backend architecture',
    'Secure authentication flows',
    'Search and retrieval systems',
]