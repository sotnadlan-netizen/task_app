export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Listen Agent API",
    description: "AI-powered mortgage advisory session management (Hebrew-first).",
    version: "1.0.0",
  },
  servers: [
    { url: "https://listen-agent-api.onrender.com", description: "Production" },
    { url: "http://localhost:3001", description: "Local" },
  ],
  security: [{ BearerAuth: [] }],
  components: {
    securitySchemes: {
      BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Session: {
        type: "object",
        properties: {
          id:             { type: "string", format: "uuid" },
          createdAt:      { type: "string", format: "date-time" },
          filename:       { type: "string" },
          summary:        { type: "string" },
          providerId:     { type: "string", format: "uuid" },
          clientEmail:    { type: "string", format: "email", nullable: true },
          audioUrl:       { type: "string", format: "uri", nullable: true },
          taskCount:      { type: "integer" },
          completedCount: { type: "integer" },
        },
      },
      Task: {
        type: "object",
        properties: {
          id:          { type: "string", format: "uuid" },
          sessionId:   { type: "string", format: "uuid" },
          title:       { type: "string" },
          description: { type: "string" },
          assignee:    { type: "string", enum: ["Advisor", "Client"] },
          priority:    { type: "string", enum: ["High", "Medium", "Low"] },
          completed:   { type: "boolean" },
          createdAt:   { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        security: [],
        responses: { "200": { description: "API is healthy" } },
      },
    },
    "/api/sessions": {
      get: {
        summary: "List sessions",
        description: "Providers see all their sessions; clients see sessions assigned to their email.",
        parameters: [
          { in: "query", name: "limit", schema: { type: "integer", default: 20 } },
          { in: "query", name: "cursor", schema: { type: "string" } },
          { in: "query", name: "search", schema: { type: "string" } },
          { in: "query", name: "from", schema: { type: "string", format: "date" } },
          { in: "query", name: "to",   schema: { type: "string", format: "date" } },
        ],
        responses: {
          "200": {
            description: "Paginated session list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    sessions:   { type: "array", items: { "$ref": "#/components/schemas/Session" } },
                    nextCursor: { type: "string", nullable: true },
                    total:      { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/sessions/{id}": {
      get: {
        summary: "Get single session",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Session detail", content: { "application/json": { schema: { "$ref": "#/components/schemas/Session" } } } },
          "404": { description: "Not found" },
        },
      },
      delete: {
        summary: "Delete session (provider-only)",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted" }, "403": { description: "Forbidden" } },
      },
    },
    "/api/sessions/{id}/audio": {
      get: {
        summary: "Get signed audio URL for playback",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Signed URL", content: { "application/json": { schema: { type: "object", properties: { url: { type: "string" } } } } } },
          "404": { description: "No audio stored for this session" },
        },
      },
    },
    "/api/process-audio": {
      post: {
        summary: "Upload audio, run AI analysis, create session + tasks",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["audio"],
                properties: {
                  audio:        { type: "string", format: "binary" },
                  systemPrompt: { type: "string" },
                  clientEmail:  { type: "string", format: "email" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Session + tasks created" },
          "422": { description: "Audio too short" },
          "429": { description: "AI quota exceeded" },
          "504": { description: "AI request timed out" },
        },
      },
    },
    "/api/tasks": {
      get: {
        summary: "List tasks for a session",
        parameters: [{ in: "query", name: "sessionId", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Task list", content: { "application/json": { schema: { type: "array", items: { "$ref": "#/components/schemas/Task" } } } } } },
      },
      post: {
        summary: "Create task manually (provider-only)",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["sessionId","title","assignee"], properties: { sessionId: { type: "string" }, title: { type: "string" }, description: { type: "string" }, assignee: { type: "string", enum: ["Advisor","Client"] }, priority: { type: "string", enum: ["High","Medium","Low"] } } } } } },
        responses: { "201": { description: "Created" }, "403": { description: "Forbidden" } },
      },
    },
    "/api/tasks/{id}": {
      patch: {
        summary: "Toggle task completion (scoped by assignee role)",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { completed: { type: "boolean" } } } } } },
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        summary: "Delete task (provider-only)",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted" }, "403": { description: "Forbidden" } },
      },
    },
    "/api/tasks/{id}/details": {
      patch: {
        summary: "Edit task details (provider-only)",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, priority: { type: "string", enum: ["High","Medium","Low"] } } } } } },
        responses: { "200": { description: "Updated" } },
      },
    },
    "/api/tasks/bulk-complete": {
      patch: {
        summary: "Bulk toggle task completion (provider-only)",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { taskIds: { type: "array", items: { type: "string" } }, completed: { type: "boolean" } } } } } },
        responses: { "200": { description: "All updated" } },
      },
    },
    "/api/config": {
      get:    { summary: "Fetch active system prompt", responses: { "200": { description: "Config object" } } },
      put:    { summary: "Update system prompt (provider-only; archives previous)", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { systemPrompt: { type: "string" } } } } } }, responses: { "200": { description: "Updated config" } } },
    },
    "/api/config/history": {
      get: {
        summary: "Return last 20 prompt history entries (provider-only)",
        responses: { "200": { description: "Array of prompt snapshots" } },
      },
    },
    "/api/analytics/overview": {
      get: {
        summary: "Task completion stats + sessions-by-month (provider-only)",
        responses: { "200": { description: "Analytics overview" } },
      },
    },
    "/api/analytics/sessions/export": {
      get: {
        summary: "Download sessions + tasks as CSV (provider-only)",
        responses: { "200": { description: "CSV file", content: { "text/csv": {} } } },
      },
    },
    "/api/profiles": {
      post: {
        summary: "Create user profile on signup",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email","role"], properties: { email: { type: "string" }, role: { type: "string", enum: ["provider","client"] } } } } } },
        responses: { "201": { description: "Profile created" } },
      },
    },
  },
};
