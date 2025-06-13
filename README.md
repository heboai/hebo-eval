# Hebo Eval

A CLI tool for evaluating and testing language models.

## Installation

### Global Installation (Recommended)

You can install Hebo Eval globally using npm:

```bash
npm install -g hebo-eval
```

Or using yarn:

```bash
yarn global add hebo-eval
```

### Using npx (No Installation)

You can run Hebo Eval without installing it using npx:

```bash
npx hebo-eval
```

## Configuration

Hebo Eval can be configured using a YAML configuration file. By default, it looks for `hebo-evals.config.yaml` in the current directory.

### Environment Variables

Hebo Eval supports two ways to use environment variables:

1. **Automatic Fallback**: If you have the required environment variables set, you don't need to specify them in the config file:

   ```bash
   export OPENAI_API_KEY=your-openai-key
   export HEBО_API_KEY=your-hebo-key
   ```

2. **Explicit Interpolation**: You can also explicitly reference environment variables in your config file:
   ```yaml
   providers:
     openai:
       provider: openai
       baseUrl: https://api.openai.com/v1
       apiKey: ${OPENAI_API_KEY}
   ```

The following environment variables are supported:

- `OPENAI_API_KEY`: API key for OpenAI provider
- `HEBO_API_KEY`: API key for Hebo provider
- `HEBO_EMBEDDING_API_KEY`: API key for Hebo embeddings.

### Configuration File

Example configuration file (`hebo-evals.config.yaml`):

```yaml
providers:
  openai:
    provider: openai
    baseUrl: https://api.openai.com/v1
    apiKey: ${OPENAI_API_KEY} # Optional if OPENAI_API_KEY is set in environment
    authHeader:
      name: Authorization
      format: Bearer ${OPENAI_API_KEY}

  hebo:
    provider: hebo
    baseUrl: https://app.hebo.ai
    apiKey: ${HEBO_API_KEY} # Optional if HEBО_API_KEY is set in environment
    authHeader:
      name: Authorization
      format: Bearer ${HEBO_API_KEY}

# Default provider to use if not specified in the command
defaultProvider: hebo

# Embedding configuration
embedding:
  provider: hebo
  model: hebo-embeddings
  baseUrl: https://api.hebo.ai/v1
  apiKey: ${HEBO_API_KEY} # Optional if HEBО_API_KEY is set in environment
```

### Configuration Options

## Usage

### Basic Commands

Check the version:

```bash
hebo-eval --version
```

Display help:

```bash
hebo-eval --help
```

## Development

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/hebo-eval.git
cd hebo-eval
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

### Development Commands

- `npm run build` - Build the project
- `npm run dev` - Watch mode for development
- `npm test` - Run tests
- `npm run lint` - Run linter
- `npm run format` - Format code

.
