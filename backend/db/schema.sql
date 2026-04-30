-- SEAL Application Database Schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) CHECK (role IN ('owner', 'employee')) NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS join_requests (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS invitations (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  email VARCHAR(100) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'expired')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS process_templates (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS template_stages (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES process_templates(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  stage_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  product_code VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  client VARCHAR(100),
  concept_image_url VARCHAR(500),
  concept_image_public_id VARCHAR(200),
  build_image_url VARCHAR(500),
  build_image_public_id VARCHAR(200),
  assigned_to INTEGER REFERENCES users(id),
  status VARCHAR(20) CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_stages (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  stage_order INTEGER NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
  assigned_to INTEGER REFERENCES users(id),
  notes TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit VARCHAR(20),
  min_threshold DECIMAL(10,2) DEFAULT 0,
  supplier VARCHAR(100),
  unit_price DECIMAL(10,2),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_materials (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  inventory_id INTEGER REFERENCES inventory(id),
  quantity DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS bills (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  bill_number VARCHAR(30) NOT NULL,
  client VARCHAR(100) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('draft', 'sent', 'paid', 'overdue')) DEFAULT 'draft',
  total_amount DECIMAL(10,2) DEFAULT 0,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bill_items (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
  description VARCHAR(200) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_products_workspace ON products(workspace_id);
CREATE INDEX IF NOT EXISTS idx_product_stages_product ON product_stages(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_workspace ON inventory(workspace_id);
CREATE INDEX IF NOT EXISTS idx_bills_workspace ON bills(workspace_id);
