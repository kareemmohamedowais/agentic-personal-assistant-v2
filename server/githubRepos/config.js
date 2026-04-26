// ─── GitHub Repos Knowledge System — Configuration ──────────────────────────

export const MAX_REPOS_PER_USER = 20;
export const MAX_FILES_PER_REPO = 500;
export const MAX_FILE_SIZE = 100 * 1024; // 100 KB

export const GITHUB_REPOS_NAMESPACE = "github_repos";

// Chunk settings — code-aware (larger = fewer broken functions)
export const CODE_CHUNK_SIZE = 3000;
export const CODE_CHUNK_OVERLAP = 500;
export const DOCS_CHUNK_SIZE = 2000;
export const DOCS_CHUNK_OVERLAP = 400;
export const CONFIG_CHUNK_SIZE = 1500;
export const CONFIG_CHUNK_OVERLAP = 200;
export const BATCH_SIZE = 96;

// Minimum score threshold for Pinecone results (0-1, higher = stricter)
export const SEARCH_SCORE_THRESHOLD = 0.25;
export const SEARCH_TOP_K = 10;

// Language-aware code separators (split on function/class boundaries first)
export const CODE_SEPARATORS = {
  default: [
    "\nfunction ",
    "\nclass ",
    "\nexport ",
    "\nconst ",
    "\nlet ",
    "\nvar ",
    "\n\n",
    "\n",
    " ",
  ],
  ".py": ["\nclass ", "\ndef ", "\nasync def ", "\n\n", "\n", " "],
  ".java": [
    "\npublic ",
    "\nprivate ",
    "\nprotected ",
    "\nclass ",
    "\ninterface ",
    "\n\n",
    "\n",
    " ",
  ],
  ".go": ["\nfunc ", "\ntype ", "\npackage ", "\n\n", "\n", " "],
  ".rs": ["\nfn ", "\npub fn ", "\nimpl ", "\nstruct ", "\nenum ", "\nmod ", "\n\n", "\n", " "],
  ".rb": ["\ndef ", "\nclass ", "\nmodule ", "\n\n", "\n", " "],
  ".php": [
    "\nfunction ",
    "\nclass ",
    "\npublic function ",
    "\nprivate function ",
    "\n\n",
    "\n",
    " ",
  ],
  ".cs": ["\npublic ", "\nprivate ", "\nprotected ", "\nclass ", "\nnamespace ", "\n\n", "\n", " "],
  ".cpp": ["\nclass ", "\nvoid ", "\nint ", "\ntemplate", "\n\n", "\n", " "],
  ".c": ["\nvoid ", "\nint ", "\nstatic ", "\ntypedef ", "\nstruct ", "\n\n", "\n", " "],
  ".swift": ["\nfunc ", "\nclass ", "\nstruct ", "\nenum ", "\nprotocol ", "\n\n", "\n", " "],
  ".dart": ["\nclass ", "\nvoid ", "\nFuture", "\nWidget ", "\n\n", "\n", " "],
  ".kt": ["\nfun ", "\nclass ", "\nobject ", "\ninterface ", "\n\n", "\n", " "],
  ".scala": ["\ndef ", "\nclass ", "\nobject ", "\ntrait ", "\n\n", "\n", " "],
  ".vue": ["\n<template", "\n<script", "\n<style", "\nexport default", "\n\n", "\n", " "],
  ".svelte": ["\n<script", "\n<style", "\n{#", "\n\n", "\n", " "],
};

// Extension → language name mapping for metadata
export const EXT_LANGUAGE_MAP = {
  ".js": "JavaScript",
  ".jsx": "React JSX",
  ".ts": "TypeScript",
  ".tsx": "React TSX",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".pyw": "Python",
  ".java": "Java",
  ".kt": "Kotlin",
  ".kts": "Kotlin",
  ".go": "Go",
  ".rs": "Rust",
  ".rb": "Ruby",
  ".php": "PHP",
  ".cs": "C#",
  ".cpp": "C++",
  ".c": "C",
  ".h": "C/C++ Header",
  ".hpp": "C++ Header",
  ".swift": "Swift",
  ".dart": "Dart",
  ".vue": "Vue",
  ".svelte": "Svelte",
  ".lua": "Lua",
  ".sh": "Shell",
  ".bash": "Bash",
  ".zsh": "Zsh",
  ".sql": "SQL",
  ".r": "R",
  ".R": "R",
  ".scala": "Scala",
  ".ex": "Elixir",
  ".exs": "Elixir",
  ".hs": "Haskell",
  ".clj": "Clojure",
  ".cljs": "ClojureScript",
  ".md": "Markdown",
  ".mdx": "MDX",
  ".txt": "Text",
  ".rst": "reStructuredText",
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".toml": "TOML",
  ".xml": "XML",
  ".ini": "INI",
  ".cfg": "Config",
};

// Extensions to index
export const CODE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".py",
  ".pyw",
  ".java",
  ".kt",
  ".kts",
  ".go",
  ".rs",
  ".rb",
  ".php",
  ".cs",
  ".cpp",
  ".c",
  ".h",
  ".hpp",
  ".swift",
  ".dart",
  ".vue",
  ".svelte",
  ".lua",
  ".sh",
  ".bash",
  ".zsh",
  ".sql",
  ".r",
  ".R",
  ".scala",
  ".ex",
  ".exs",
  ".hs",
  ".clj",
  ".cljs",
]);

export const DOCS_EXTENSIONS = new Set([".md", ".mdx", ".txt", ".rst", ".adoc"]);

export const CONFIG_EXTENSIONS = new Set([
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".cfg",
  ".env.example",
  ".editorconfig",
  ".xml",
  ".gradle",
]);

// Important files always indexed regardless of extension
export const IMPORTANT_FILES = new Set([
  "README.md",
  "readme.md",
  "README.rst",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "CHANGES.md",
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "Makefile",
  "CMakeLists.txt",
  "package.json",
  "tsconfig.json",
  "pyproject.toml",
  "setup.py",
  "setup.cfg",
  "Cargo.toml",
  "go.mod",
  "Gemfile",
  "composer.json",
  "build.gradle",
  "pom.xml",
  ".gitignore",
  ".dockerignore",
]);

// Directories to skip completely
export const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  "vendor",
  "venv",
  ".venv",
  "env",
  ".idea",
  ".vscode",
  ".vs",
  "coverage",
  ".nyc_output",
  "target",
  "bin",
  "obj",
  ".gradle",
  ".maven",
  "tmp",
  "temp",
  "cache",
  "logs",
  "log",
  ".tox",
  ".eggs",
]);
