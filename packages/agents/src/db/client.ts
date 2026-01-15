import pg from 'pg'

const { Pool } = pg

export const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mellivora',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export async function initDatabase() {
  const client = await db.connect()
  try {
    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector')

    // fund_profile and fund_nav tables are created by sync-from-mysql.ts
    // Here we only create auxiliary tables

    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        fund_code VARCHAR(50),
        title VARCHAR(200) NOT NULL,
        content TEXT,
        file_path VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        chunk_text TEXT NOT NULL,
        embedding vector(1536),
        metadata JSONB DEFAULT '{}'
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        mode VARCHAR(20) DEFAULT 'simple',
        title VARCHAR(200),
        messages JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS kg_nodes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        name VARCHAR(200) NOT NULL,
        properties JSONB DEFAULT '{}'
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS kg_edges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id UUID REFERENCES kg_nodes(id) ON DELETE CASCADE,
        target_id UUID REFERENCES kg_nodes(id) ON DELETE CASCADE,
        relation VARCHAR(50) NOT NULL,
        properties JSONB DEFAULT '{}'
      )
    `)

    // News cache for historical analysis
    await client.query(`
      CREATE TABLE IF NOT EXISTS news_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fund_code VARCHAR(50),
        title VARCHAR(500),
        url TEXT,
        snippet TEXT,
        search_query VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(fund_code, title)
      )
    `)

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
      CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_kg_nodes_type ON kg_nodes(type);
      CREATE INDEX IF NOT EXISTS idx_news_cache_fund ON news_cache(fund_code, created_at);
    `)

    console.log('Database initialized successfully')
  } finally {
    client.release()
  }
}
