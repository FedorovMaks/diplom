-- ОбщийОпросСтудентов
CREATE TABLE IF NOT EXISTS general_student_survey (
  id            BIGSERIAL PRIMARY KEY,
  group_name    TEXT NOT NULL,
  q1   SMALLINT,
  q2   SMALLINT,
  q3   SMALLINT,
  q4   SMALLINT,
  q5   SMALLINT,
  q6   SMALLINT,
  q7_1 SMALLINT,
  q7_2 SMALLINT,
  q7_3 SMALLINT,
  q8_1 SMALLINT,
  q8_2 SMALLINT,
  q8_3 SMALLINT,
  q8_4 SMALLINT,
  q8_5 SMALLINT,
  q8_6 SMALLINT,
  q8_7 SMALLINT,
  q9   SMALLINT,
  q10  SMALLINT,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ОценкаППС
CREATE TABLE IF NOT EXISTS pps_evaluation (
  id            BIGSERIAL PRIMARY KEY,
  group_name    TEXT NOT NULL,
  teacher_id    INT  NOT NULL,
  teacher_fio   TEXT NOT NULL,
  c1  SMALLINT,
  c2  SMALLINT,
  c3  SMALLINT,
  c4  SMALLINT,
  c5  SMALLINT,
  c6  SMALLINT,
  c7  SMALLINT,
  c8  SMALLINT,
  c9  SMALLINT,
  c10 SMALLINT,
  c11 SMALLINT,
  c12 SMALLINT,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ОпросПреподавателей
CREATE TABLE IF NOT EXISTS teacher_survey (
  id            BIGSERIAL PRIMARY KEY,
  q1 SMALLINT,
  q2 SMALLINT,
  q3 SMALLINT,
  q4 SMALLINT,
  q5_options TEXT[],
  q6_text    TEXT,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
