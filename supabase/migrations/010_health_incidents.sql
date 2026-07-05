CREATE TYPE incident_type_enum AS ENUM ('illness', 'injury');
CREATE TYPE incident_severity_enum AS ENUM ('mild', 'moderate', 'severe');
CREATE TYPE incident_status_enum AS ENUM ('active', 'recovering', 'resolved');

CREATE TABLE health_incidents (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type           incident_type_enum NOT NULL,
  name           TEXT NOT NULL,
  body_part      TEXT,
  severity       incident_severity_enum,
  status         incident_status_enum NOT NULL DEFAULT 'active',
  started_date   DATE NOT NULL,
  resolved_date  DATE,
  symptoms       TEXT,
  treatment      TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE health_incident_updates (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id  UUID NOT NULL REFERENCES health_incidents(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  note         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON health_incidents (status);
CREATE INDEX ON health_incidents (started_date);
CREATE INDEX ON health_incident_updates (incident_id);

ALTER TABLE health_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_incident_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_anon" ON health_incidents FOR ALL TO anon USING (false);
CREATE POLICY "no_anon" ON health_incident_updates FOR ALL TO anon USING (false);
