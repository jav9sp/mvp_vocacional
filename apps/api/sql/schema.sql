-- =========================================================
-- Canonical schema - MVP Vocacional (MySQL 8+)
-- Fuente de verdad: SQL
-- =========================================================

CREATE DATABASE IF NOT EXISTS mvp_vocacional
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE mvp_vocacional;

-- -------------------------
-- organizations
-- -------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(180) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_organizations_name (name)
) ENGINE=InnoDB;

-- -------------------------
-- users
-- Fuente verdad: rut es requerido para login
-- -------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id INT UNSIGNED NOT NULL DEFAULT 1,

  rut VARCHAR(20) NOT NULL,
  role ENUM('admin','student') NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  mustChangePassword TINYINT(1) NOT NULL DEFAULT 0,

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  UNIQUE KEY uniq_users_email (email),
  UNIQUE KEY uniq_users_rut (rut),

  KEY idx_users_role (role),
  KEY idx_users_organization_id (organization_id),

  CONSTRAINT fk_users_organization
    FOREIGN KEY (organization_id)
    REFERENCES organizations (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- -------------------------
-- tests
-- -------------------------
CREATE TABLE IF NOT EXISTS tests (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(50) NOT NULL,
  version VARCHAR(30) NOT NULL,
  name VARCHAR(180) NOT NULL,
  isActive TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_tests_key_version (`key`, version),
  KEY idx_tests_active (isActive)
) ENGINE=InnoDB;

-- -------------------------
-- periods
-- -------------------------
CREATE TABLE IF NOT EXISTS periods (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  organizationId INT UNSIGNED NOT NULL,
  testId INT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  status ENUM('draft','active','closed') NOT NULL DEFAULT 'draft',
  startAt DATETIME NULL,
  endAt DATETIME NULL,
  settings JSON NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),

  KEY idx_periods_org (organizationId),
  KEY idx_periods_test (testId),
  KEY idx_periods_status (status),

  CONSTRAINT fk_periods_org
    FOREIGN KEY (organizationId) REFERENCES organizations(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT fk_periods_test
    FOREIGN KEY (testId) REFERENCES tests(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -------------------------
-- enrollments (period <-> student)
-- FUENTE VERDAD: unique compuesto real (sin hacks)
-- -------------------------
CREATE TABLE IF NOT EXISTS enrollments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  periodId INT UNSIGNED NOT NULL,
  studentUserId INT UNSIGNED NOT NULL,
  status ENUM('invited','active','completed','removed') NOT NULL DEFAULT 'active',
  meta JSON NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),

  UNIQUE KEY uniq_period_student (periodId, studentUserId),
  KEY idx_enrollments_period (periodId),
  KEY idx_enrollments_student (studentUserId),

  CONSTRAINT fk_enrollments_period
    FOREIGN KEY (periodId) REFERENCES periods(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_enrollments_student
    FOREIGN KEY (studentUserId) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -------------------------
-- questions
-- -------------------------
CREATE TABLE IF NOT EXISTS questions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  testId INT UNSIGNED NOT NULL,
  externalId INT UNSIGNED NOT NULL,
  text TEXT NOT NULL,
  area VARCHAR(10) NOT NULL,
  dim JSON NOT NULL,
  orderIndex INT UNSIGNED NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),

  UNIQUE KEY uniq_questions_test_external (testId, externalId),
  KEY idx_questions_test_order (testId, orderIndex),

  CONSTRAINT fk_questions_test
    FOREIGN KEY (testId) REFERENCES tests(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -------------------------
-- attempts
-- 1 intento por usuario por periodo
-- -------------------------
CREATE TABLE IF NOT EXISTS attempts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  userId INT UNSIGNED NOT NULL,
  testId INT UNSIGNED NOT NULL,
  periodId INT UNSIGNED NOT NULL,
  status ENUM('in_progress','finished') NOT NULL DEFAULT 'in_progress',
  answeredCount INT UNSIGNED NOT NULL DEFAULT 0,
  finishedAt DATETIME NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),

  UNIQUE KEY uniq_attempt_user_period (userId, periodId),
  KEY idx_attempts_user (userId),
  KEY idx_attempts_test (testId),
  KEY idx_attempts_period (periodId),
  KEY idx_attempts_period_status (periodId, status),

  CONSTRAINT fk_attempts_user
    FOREIGN KEY (userId) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_attempts_test
    FOREIGN KEY (testId) REFERENCES tests(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT fk_attempts_period
    FOREIGN KEY (periodId) REFERENCES periods(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -------------------------
-- answers
-- -------------------------
CREATE TABLE IF NOT EXISTS answers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attemptId INT UNSIGNED NOT NULL,
  questionId INT UNSIGNED NOT NULL,
  value TINYINT(1) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),

  UNIQUE KEY uniq_answers_attempt_question (attemptId, questionId),
  KEY idx_answers_attempt (attemptId),
  KEY idx_answers_question (questionId),

  CONSTRAINT fk_answers_attempt
    FOREIGN KEY (attemptId) REFERENCES attempts(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_answers_question
    FOREIGN KEY (questionId) REFERENCES questions(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -------------------------
-- results
-- -------------------------
CREATE TABLE IF NOT EXISTS results (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attemptId INT UNSIGNED NOT NULL,
  scoresByArea JSON NOT NULL,
  scoresByAreaDim JSON NOT NULL,
  topAreas JSON NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),

  UNIQUE KEY uniq_results_attempt (attemptId),

  CONSTRAINT fk_results_attempt
    FOREIGN KEY (attemptId) REFERENCES attempts(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;
