export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  email_verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS auth_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL,
  last_login_at TEXT,
  UNIQUE (provider, subject)
);

CREATE INDEX IF NOT EXISTS auth_identities_user ON auth_identities (user_id);

CREATE TABLE IF NOT EXISTS auth_attempts (
  key TEXT NOT NULL,
  at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_attempts_key ON auth_attempts (key, at);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT,
  municipality_code TEXT,
  municipality_name TEXT,
  region_name TEXT,
  postal_code TEXT,
  household_size INTEGER NOT NULL DEFAULT 2,
  locale TEXT NOT NULL DEFAULT 'fr',
  weekly_budget_cents INTEGER NOT NULL DEFAULT 18000,
  cooking_time_minutes INTEGER NOT NULL DEFAULT 45,
  diets TEXT NOT NULL DEFAULT '["omnivore"]',
  custom_diet_notes TEXT,
  breakfast_prefs TEXT NOT NULL DEFAULT '[]',
  lunch_prefs TEXT NOT NULL DEFAULT '[]',
  dinner_prefs TEXT NOT NULL DEFAULT '[]',
  goals TEXT NOT NULL DEFAULT '[]',
  other_exclusions TEXT NOT NULL DEFAULT '[]',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_allergens (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  PRIMARY KEY (user_id, code)
);

CREATE TABLE IF NOT EXISTS municipalities (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  designation TEXT,
  postal TEXT,
  postal_compact TEXT,
  fsa TEXT,
  region_name TEXT,
  region_code TEXT,
  mrc_name TEXT
);

CREATE INDEX IF NOT EXISTS municipalities_name_idx ON municipalities (name_normalized);
CREATE INDEX IF NOT EXISTS municipalities_postal_idx ON municipalities (postal_compact);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  description_fr TEXT NOT NULL,
  description_en TEXT,
  prep_minutes INTEGER NOT NULL,
  cook_minutes INTEGER NOT NULL,
  rest_minutes INTEGER NOT NULL DEFAULT 0,
  servings INTEGER NOT NULL,
  cost_per_serving_cents INTEGER,
  cost_estimated_at TEXT,
  cost_source TEXT,
  cost_note_fr TEXT,
  cost_note_en TEXT,
  difficulty TEXT NOT NULL,
  seasons TEXT NOT NULL,
  meal_slots TEXT NOT NULL,
  contains TEXT NOT NULL,
  allergens TEXT NOT NULL,
  cross_contamination TEXT NOT NULL DEFAULT '[]',
  allergen_data_complete BOOLEAN NOT NULL DEFAULT TRUE,
  region_name TEXT,
  region_documented BOOLEAN NOT NULL DEFAULT FALSE,
  region_note_fr TEXT,
  region_note_en TEXT,
  photo_url TEXT,
  photo_credit TEXT,
  photo_license TEXT,
  steps_fr TEXT NOT NULL,
  steps_en TEXT NOT NULL,
  tags TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  source TEXT NOT NULL DEFAULT 'curated',
  ai_reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  quantity DOUBLE PRECISION,
  unit TEXT,
  category TEXT NOT NULL,
  allergens TEXT NOT NULL DEFAULT '[]',
  sub_ingredients TEXT NOT NULL DEFAULT '[]',
  scalable BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS meal_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_date TEXT NOT NULL,
  slot TEXT NOT NULL,
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  servings INTEGER NOT NULL,
  reaction TEXT,
  explanation TEXT NOT NULL,
  warnings TEXT NOT NULL DEFAULT '{"fr":[],"en":[]}',
  relaxed TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  UNIQUE (user_id, plan_date, slot)
);

CREATE INDEX IF NOT EXISTS meal_plans_user_date_idx ON meal_plans (user_id, plan_date);

CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, recipe_id)
);

-- Recettes sauvegardées pour plus tard (distinctes des favoris, qui expriment un coup de cœur).
CREATE TABLE IF NOT EXISTS saved_recipes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, recipe_id)
);

-- Listes d'épicerie nommées, créées et gérées par la personne (en plus de la liste hebdomadaire automatique).
CREATE TABLE IF NOT EXISTS shopping_lists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS shopping_lists_user ON shopping_lists (user_id);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity DOUBLE PRECISION,
  unit TEXT,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  source_recipe_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS shopping_list_items_list ON shopping_list_items (list_id);

CREATE TABLE IF NOT EXISTS grocery_lists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, week_start)
);

CREATE TABLE IF NOT EXISTS grocery_items (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity DOUBLE PRECISION,
  unit TEXT,
  category TEXT NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  custom BOOLEAN NOT NULL DEFAULT FALSE,
  manual BOOLEAN NOT NULL DEFAULT FALSE,
  merge_note TEXT,
  source_key TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  daily_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  daily_time TEXT NOT NULL DEFAULT '07:30',
  weekly_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  weekly_day INTEGER NOT NULL DEFAULT 6,
  weekly_time TEXT NOT NULL DEFAULT '10:00',
  channel TEXT NOT NULL DEFAULT 'in_app',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TEXT,
  channel TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS data_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  url TEXT,
  geographic_zone TEXT,
  updated_on TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS app_errors (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  context TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_outputs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  output TEXT NOT NULL,
  validated BOOLEAN NOT NULL,
  rejection_reason TEXT,
  created_at TEXT NOT NULL
);
`;
