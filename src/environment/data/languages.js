const languages =
{
    javaScript: {
        label: 'JavaScript',
        info: 'JavaScript is a programming language used to make web pages interactive. It allows developers to create dynamic content updates, control multimedia, animate icons, and much more, enhancing the user experience on a website. It is the third layer of standard web technologies, alongside HTML and CSS, and is essential for modern web development.',
        skill: 81,
        icon: 'logos:javascript'
    },

    html: {
        label: 'HTML',
        info: 'HTML (HyperText Markup Language) is the standard markup language for creating web pages. It is the foundation of any website and is used to structure the page content, including text, icons, videos, and more. HTML uses tags to define elements such as headers, paragraphs, lists, links, and forms, among others. These tags allow web browsers to interpret and display the content appropriately.',
        skill: 40,
        icon: 'devicon:html5'
    },
    css: {
        label: 'CSS',
        info: 'CSS (Cascading Style Sheets) is a style sheet language used to describe the appearance and formatting of a document written in HTML or XML. It allows developers to precisely control how HTML elements are displayed in the browser, applying designs, colors, fonts, margins, sizes, and more.',
        skill: 50,
        icon: 'skill-icons:css'
    },

    python: {
        label: 'python',
        name: 'Python',
        info: 'Python is a high-level, interpreted programming language, known for its clear and readable syntax, similar to English. It was created by Guido van Rossum in 1991 and has become one of the most popular programming languages due to its versatility, ease of learning, and use in various areas such as web development, mobile applications, data science, machine learning, and more.',
        skill: 95,
        icon: "logos:python"
    },

    cSharp: {
        label: 'C#',
        info: 'C# is a modern, object-oriented programming language with type safety, designed to create secure and robust applications that run in the .NET environment. This language is based on the C family of languages and is familiar to programmers of C, C++, Java, and JavaScript. C# is used in a wide range of applications and platforms due to its versatility and simplicity.',
        skill: 95,
        icon: 'devicon:csharp'
    },
    mips: {
        label: 'MIPS',
        info: 'The MIPS (Microprocessor without Interlocked Pipelined Stages) language is a set of low-level instructions designed to be used in RISC (Reduced Instruction Set Computer) processor architectures and as a target language in compiler design.',
        skill: 80,
        icon: 'logos:nasm'
    },
    prolog: {
        label: 'Prolog',
        info: 'Prolog is a logical programming language that originated in the field of artificial intelligence, automated theorem proving, and computational linguistics. It is based on first-order logic, a formal form of logic, and unlike many other programming languages, Prolog is primarily designed as a declarative programming language.',
        skill: 10,
        icon: 'devicon:prolog'
    },
    c: {
        label: 'C',
        info: 'C is a general-purpose programming language that was created in the 1970s by Dennis Ritchie at Bell Labs. It is widely used and influential, with its design reflecting the capabilities of the targeted CPUs. C has found lasting use in operating systems, device drivers, and protocol stacks, and it is commonly used across a range of computer architectures, from supercomputers to microcontrollers and embedded systems',
        skill: 18,
        svg: process.env.PUBLIC_URL + "/images/icons/skills/c.png",
        // icon: 'logos:c'
    },
    cPlusPlus: {
        label: 'C++',
        info: 'C++ is a highly versatile and widely used programming language, known for its efficiency, control over system resources, and support for both low-level and high-level application development. Developed by Bjarne Stroustrup as an extension of the C language, C++ introduced object-oriented programming (OOP) to the C language, making it a middle-level language capable of handling both low-level system programming (such as operating systems, device drivers, and kernels) and high-level application development (like games, GUI applications, and desktop software).',
        skill: 20,
        icon: 'logos:c-plusplus'
    },
    dart: {
        label: 'Dart',
        info: 'Dart is a client-optimized programming language developed by Google, designed for crafting fast apps on any platform. It aims to offer a highly productive programming experience for multi-platform development, supported by a flexible execution runtime platform for app frameworks. Dart is particularly suited for client development, focusing on both efficient development processes, such as sub-second stateful hot reload, and delivering high-quality production experiences across various compilation targets like web, mobile, and desktop platforms.',
        skill: 35,
        icon: 'logos:dart'
    },
    go: {
        label: 'GO',
        name: 'Go',
        info: 'Go, also known as Golang, is a modern systems programming language developed by Google in 2009. It was designed to be fast, secure, and easy to learn, aiming to boost developer productivity. Go features rapid compilation and execution, native concurrency support through goroutines and channels, and automatic memory management. With its simple syntax and minimalistic approach, Go has gained popularity for building scalable and efficient applications, particularly in web services, distributed systems, and infrastructure-as-code projects. ',
        skill: 15,
        icon: 'logos:go'
    },
    haskell: {
        label: 'Haskell',
        info: 'Haskell is a mature functional programming language that excels at maintaining quality and developer productivity, particularly in web applications and networked servers. Its strong type system and functional programming paradigm ensure high reliability and maintainability in software development.',
        skill: 15,
        icon: 'devicon:haskell'
    },
    gdscript: {
        label: 'GDScript',
        info: 'GDScript is the high-level scripting language designed for the Godot Engine. It offers a lightweight syntax inspired by Python, tight integration with Godot nodes and scenes, and fast iteration for gameplay logic, tools, UI behavior, and game systems.',
        skill: 80,
        icon: 'devicon:godot'
    },
    rust: {
        label: 'Rust',
        info: 'Rust is a modern systems programming language focused on safety and performance, designed to compete with C++ while maintaining memory security guarantees. It excels in systems programming, embedded systems, game development, and high-performance computing applications. ',
        skill: 15,
        icon: 'skill-icons:rust'
    },
}
export default languages