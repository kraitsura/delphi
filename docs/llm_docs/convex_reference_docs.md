

## understanding

Introduction to Convex - the reactive database with TypeScript queries

- [Convex Overview](/understanding.md): Introduction to Convex - the reactive database with TypeScript queries
- [Best Practices](/understanding/best-practices.md): Essential best practices for building scalable Convex applications including database queries, function organization, validation, and security.
- [TypeScript](/understanding/best-practices/typescript.md): Move faster with end-to-end type safety
- [Dev workflow](/understanding/workflow.md): Development workflow from project creation to production deployment
- [The Zen of Convex](/understanding/zen.md): Convex best practices and design philosophy


## client

- [Convex with TanStack Query](/client/tanstack/tanstack-query.md): Integrate Convex with TanStack Query for advanced data fetching patterns
- [TanStack Start](/client/tanstack/tanstack-start.md): How Convex works with TanStack Start

## functions

Write functions to define your server behavior

- [Functions](/functions.md): Write functions to define your server behavior
- [Actions](/functions/actions.md): Call third-party services and external APIs from Convex
- [Bundling](/functions/bundling.md): How Convex bundles and optimizes your function code
- [Debugging](/functions/debugging.md): Debug Convex functions during development and production
- [Error Handling](/functions/error-handling.md): Handle errors in Convex queries, mutations, and actions
- [Application Errors](/functions/error-handling/application-errors.md): Handle expected failures in Convex functions
- [HTTP Actions](/functions/http-actions.md): Build HTTP APIs directly in Convex
- [Internal Functions](/functions/internal-functions.md): Functions that can only be called by other Convex functions
- [Mutations](/functions/mutation-functions.md): Insert, update, and remove data from the database
- [Queries](/functions/query-functions.md): Fetch data from the database with caching and reactivity
- [Runtimes](/functions/runtimes.md): Learn the differences between the Convex and Node.js runtimes for functions
- [Argument and Return Value Validation](/functions/validation.md): Validate function arguments and return values for security

## database

Store JSON-like documents with a relational data model

- [Database](/database.md): Store JSON-like documents with a relational data model
- [OCC and Atomicity](/database/advanced/occ.md): Optimistic concurrency control and transaction atomicity in Convex
- [Schema Philosophy](/database/advanced/schema-philosophy.md): Convex schema design philosophy and best practices
- [System Tables](/database/advanced/system-tables.md): Access metadata for Convex built-in features through system tables including scheduled functions and file storage information.
- [Backups](/database/backup-restore.md): Backup and restore your Convex data and files
- [Document IDs](/database/document-ids.md): Create complex, relational data models using IDs
- [Data Import & Export](/database/import-export.md): Import data from existing sources and export data to external systems
- [Data Export](/database/import-export/export.md): Export your data out of Convex
- [Data Import](/database/import-export/import.md): Import data into Convex
- [Paginated Queries](/database/pagination.md): Load paginated queries
- [Reading Data](/database/reading-data.md): Query and read data from Convex database tables
- [Filtering](/database/reading-data/filters.md): Filter documents in Convex queries
- [Indexes](/database/reading-data/indexes.md): Speed up queries with database indexes
- [Introduction to Indexes and Query Performance](/database/reading-data/indexes/indexes-and-query-perf.md): Learn the effects of indexes on query performance
- [Schemas](/database/schemas.md): Schema validation keeps your Convex data neat and tidy. It also gives you end-to-end TypeScript type safety!
- [Data Types](/database/types.md): Supported data types in Convex documents
- [Writing Data](/database/writing-data.md): Insert, update, and delete data in Convex database tables





## search

Run search queries over your Convex documents

- [AI & Search](/search.md): Run search queries over your Convex documents
- [Full Text Search](/search/text-search.md): Run search queries over your Convex documents
- [Vector Search](/search/vector-search.md): Run vector search queries on embeddings


## agents

Building AI Agents with Convex

- [AI Agents](/agents.md): Building AI Agents with Convex
- [Agent Definition and Usage](/agents/agent-usage.md): Configuring and using the Agent class
- [LLM Context](/agents/context.md): Customizing the context provided to the Agent's LLM
- [Debugging](/agents/debugging.md): Debugging the Agent component
- [Files and Images in Agent messages](/agents/files.md): Working with images and files in the Agent component
- [Getting Started with Agent](/agents/getting-started.md): Setting up the agent component
- [Human Agents](/agents/human-agents.md): Saving messages from a human as an agent
- [Messages](/agents/messages.md): Sending and receiving messages with an agent
- [Playground](/agents/playground.md): A simple way to test, debug, and develop with the agent
- [RAG (Retrieval-Augmented Generation) with the Agent component](/agents/rag.md): Examples of how to use RAG with the Convex Agent component
- [Rate Limiting](/agents/rate-limiting.md): Control the rate of requests to your AI agent
- [Streaming](/agents/streaming.md): Streaming messages with an agent
- [Threads](/agents/threads.md): Group messages together in a conversation history
- [Tools](/agents/tools.md): Using tool calls with the Agent component
- [Usage Tracking](/agents/usage-tracking.md): Tracking token usage of the Agent component
- [Workflows](/agents/workflows.md): Defining long-lived workflows for the Agent component


## components

Self contained building blocks of your app

- [Components](/components.md): Self contained building blocks of your app
- [Using Components](/components/using-components.md): Using existing components


