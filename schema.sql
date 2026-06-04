-- SQL Schema for FIFA World Cup Betting Application
-- Compatible with PostgreSQL or MySQL

-- Drop tables in order of dependency to allow fresh runs
DROP TABLE IF EXISTS community_votes;
DROP TABLE IF EXISTS wagers;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS tournament_bet_options;
DROP TABLE IF EXISTS tournament_bets;
DROP TABLE IF EXISTS users;

-- 1. Users Table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    coins INT DEFAULT 500 NOT NULL,
    points INT DEFAULT 0 NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Teams Table
CREATE TABLE teams (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    fifarank INT NOT NULL
);

-- 3. Matches Table (Normalized, references teams table)
CREATE TABLE matches (
    id VARCHAR(50) PRIMARY KEY,
    team_a_id VARCHAR(50) REFERENCES teams(id) ON DELETE RESTRICT,
    team_b_id VARCHAR(50) REFERENCES teams(id) ON DELETE RESTRICT,
    kickoff_time TIMESTAMP NOT NULL,
    odds_home DECIMAL(5, 2) NOT NULL,
    odds_draw DECIMAL(5, 2) NOT NULL,
    odds_away DECIMAL(5, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
    score_a INT DEFAULT NULL,
    score_b INT DEFAULT NULL,
    votes_home INT DEFAULT 0,
    votes_draw INT DEFAULT 0,
    votes_away INT DEFAULT 0,
    is_auto_created BOOLEAN DEFAULT TRUE
);

-- 4. Tournament Bets Table
CREATE TABLE tournament_bets (
    id VARCHAR(50) PRIMARY KEY,
    question TEXT NOT NULL,
    kickoff_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    winning_option_id VARCHAR(50) DEFAULT NULL
);

-- 5. Tournament Bet Options Table (One-to-Many with Tournament Bets)
CREATE TABLE tournament_bet_options (
    id VARCHAR(50) PRIMARY KEY,
    bet_id VARCHAR(50) REFERENCES tournament_bets(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    odds DECIMAL(5, 2) NOT NULL
);

-- 6. Wagers Table (Tracks all bets placed by users)
CREATE TABLE wagers (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    target_id VARCHAR(50) NOT NULL, -- references either matches(id) or tournament_bets(id)
    target_type VARCHAR(30) NOT NULL CHECK (target_type IN ('match_outcome', 'match_score', 'tournament')),
    prediction VARCHAR(100) NOT NULL, -- 'home', 'draw', 'away', or exact score line "2-1", or selected option_id
    exact_score_a INT DEFAULT NULL,
    exact_score_b INT DEFAULT NULL,
    amount INT NOT NULL CHECK (amount > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'resolved', 'cancelled')),
    odds_at_wager DECIMAL(5, 2) NOT NULL,
    payout_points INT DEFAULT 0,
    payout_coins INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP DEFAULT NULL
);

-- 7. Community Votes Table (Unique vote per user per match)
CREATE TABLE community_votes (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    match_id VARCHAR(50) REFERENCES matches(id) ON DELETE CASCADE,
    prediction VARCHAR(10) NOT NULL CHECK (prediction IN ('home', 'draw', 'away')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, match_id)
);

-- Create Indexes for fast querying
CREATE INDEX idx_wagers_user_id ON wagers(user_id);
CREATE INDEX idx_wagers_target_id ON wagers(target_id);
CREATE INDEX idx_community_votes_match_id ON community_votes(match_id);
CREATE INDEX idx_tournament_bet_options_bet_id ON tournament_bet_options(bet_id);

-- =========================================================================
-- Seed Data Insertion
-- =========================================================================

-- Insert Seed Users
INSERT INTO users (id, username, role, coins, points, joined_at) VALUES
('usr-admin', 'Vaasan (Admin)', 'admin', 2000, 0, '2026-05-25 10:00:00'),
('usr-aaryan', 'AJ (Tactician)', 'user', 500, 0, '2026-05-25 11:30:00'),
('usr-sharan', 'SS (High Roller)', 'user', 500, 0, '2026-05-26 08:15:00'),
('usr-mudit', 'MB (Striker)', 'user', 500, 0, '2026-05-26 14:20:00'),
('usr-prasann', 'PB (Underdog)', 'user', 500, 0, '2026-05-27 09:00:00');

-- Insert All 48 Qualified Teams for FIFA World Cup 2026
INSERT INTO teams (id, name, emoji, fifarank) VALUES
('arg', 'Argentina', '🇦🇷', 3),
('fra', 'France', '🇫🇷', 1),
('esp', 'Spain', '🇪🇸', 2),
('eng', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 4),
('por', 'Portugal', '🇵🇹', 5),
('bra', 'Brazil', '🇧🇷', 6),
('ned', 'Netherlands', '🇳🇱', 7),
('mar', 'Morocco', '🇲🇦', 8),
('bel', 'Belgium', '🇧🇪', 9),
('ger', 'Germany', '🇩🇪', 10),
('cro', 'Croatia', '🇭🇷', 11),
('col', 'Colombia', '🇨🇴', 12),
('sen', 'Senegal', '🇸🇳', 13),
('mex', 'Mexico', '🇲🇽', 14),
('usa', 'United States', '🇺🇸', 15),
('uru', 'Uruguay', '🇺🇾', 16),
('jpn', 'Japan', '🇯🇵', 17),
('sui', 'Switzerland', '🇨🇭', 18),
('irn', 'Iran', '🇮🇷', 19),
('aut', 'Austria', '🇦🇹', 20),
('kor', 'South Korea', '🇰🇷', 21),
('tur', 'Türkiye', '🇹🇷', 22),
('aus', 'Australia', '🇦🇺', 23),
('egy', 'Egypt', '🇪🇬', 24),
('can', 'Canada', '🇨🇦', 25),
('ecu', 'Ecuador', '🇪🇨', 26),
('civ', 'Côte d''Ivoire', '🇨🇮', 27),
('cze', 'Czechia', '🇨🇿', 28),
('qat', 'Qatar', '🇶🇦', 29),
('swe', 'Sweden', '🇸🇪', 30),
('sco', 'Scotland', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 31),
('tun', 'Tunisia', '🇹🇳', 32),
('pan', 'Panama', '🇵🇦', 33),
('alg', 'Algeria', '🇩🇿', 34),
('nor', 'Norway', '🇳🇴', 35),
('par', 'Paraguay', '🇵🇾', 36),
('ksa', 'Saudi Arabia', '🇸🇦', 37),
('irq', 'Iraq', '🇮🇶', 38),
('rsa', 'South Africa', '🇿🇦', 39),
('cod', 'DR Congo', '🇨🇩', 40),
('gha', 'Ghana', '🇬🇭', 41),
('cpv', 'Cabo Verde', '🇨🇻', 42),
('uzb', 'Uzbekistan', '🇺🇿', 43),
('bih', 'Bosnia and Herzegovina', '🇧🇦', 44),
('jor', 'Jordan', '🇯🇴', 45),
('hai', 'Haiti', '🇭🇹', 46),
('cuw', 'Curaçao', '🇨🇼', 47),
('nzl', 'New Zealand', '🇳🇿', 48);

-- Insert Seed Matches (using foreign keys referencing teams)
INSERT INTO matches (id, team_a_id, team_b_id, kickoff_time, odds_home, odds_draw, odds_away, status, score_a, score_b, votes_home, votes_draw, votes_away, is_auto_created) VALUES
('match-1', 'mex', 'rsa', '2026-06-11 15:00:00', 1.71, 4.00, 6.00, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-2', 'kor', 'cze', '2026-06-11 18:00:00', 2.33, 4.00, 3.11, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-3', 'mex', 'kor', '2026-06-16 15:00:00', 2.40, 4.00, 3.00, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-4', 'rsa', 'cze', '2026-06-16 18:00:00', 4.13, 4.00, 1.97, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-5', 'mex', 'cze', '2026-06-21 16:00:00', 2.13, 4.00, 3.56, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-6', 'rsa', 'kor', '2026-06-21 20:00:00', 5.07, 4.00, 1.81, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-7', 'can', 'bih', '2026-06-12 15:00:00', 1.61, 4.00, 7.73, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-8', 'qat', 'sui', '2026-06-12 18:00:00', 3.40, 4.00, 2.19, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-9', 'can', 'qat', '2026-06-17 15:00:00', 2.44, 4.00, 2.93, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-10', 'bih', 'sui', '2026-06-17 18:00:00', 9.60, 4.00, 1.55, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-11', 'can', 'sui', '2026-06-22 16:00:00', 3.06, 4.00, 2.37, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-12', 'bih', 'qat', '2026-06-22 20:00:00', 6.67, 4.00, 1.67, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-13', 'bra', 'mar', '2026-06-13 15:00:00', 2.60, 4.00, 2.73, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-14', 'hai', 'sco', '2026-06-13 18:00:00', 9.33, 4.00, 1.56, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-15', 'bra', 'hai', '2026-06-18 15:00:00', 1.43, 4.00, 20.44, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-16', 'mar', 'sco', '2026-06-18 18:00:00', 1.92, 4.00, 4.37, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-17', 'bra', 'sco', '2026-06-23 16:00:00', 1.89, 4.00, 4.52, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-18', 'mar', 'hai', '2026-06-23 20:00:00', 1.43, 4.00, 19.56, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-19', 'usa', 'par', '2026-06-13 15:00:00', 1.84, 4.00, 4.82, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-20', 'aus', 'tur', '2026-06-13 18:00:00', 2.72, 4.00, 2.62, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-21', 'usa', 'aus', '2026-06-18 15:00:00', 2.35, 4.00, 3.08, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-22', 'par', 'tur', '2026-06-18 18:00:00', 4.10, 4.00, 1.98, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-23', 'usa', 'tur', '2026-06-23 16:00:00', 2.39, 4.00, 3.01, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-24', 'par', 'aus', '2026-06-23 20:00:00', 4.00, 4.00, 2.00, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-25', 'ger', 'cuw', '2026-06-14 15:00:00', 1.40, 4.00, 25.00, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-26', 'civ', 'ecu', '2026-06-14 18:00:00', 2.73, 4.00, 2.61, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-27', 'ger', 'civ', '2026-06-19 15:00:00', 2.09, 4.00, 3.70, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-28', 'cuw', 'ecu', '2026-06-19 18:00:00', 16.67, 4.00, 1.45, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-29', 'ger', 'ecu', '2026-06-24 16:00:00', 2.12, 4.00, 3.59, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-30', 'cuw', 'civ', '2026-06-24 20:00:00', 16.00, 4.00, 1.45, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-31', 'ned', 'jpn', '2026-06-14 15:00:00', 2.35, 4.00, 3.08, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-32', 'swe', 'tun', '2026-06-14 18:00:00', 2.53, 4.00, 2.82, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-33', 'ned', 'swe', '2026-06-19 15:00:00', 1.94, 4.00, 4.28, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-34', 'jpn', 'tun', '2026-06-19 18:00:00', 2.04, 4.00, 3.84, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-35', 'ned', 'tun', '2026-06-24 16:00:00', 1.87, 4.00, 4.63, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-36', 'jpn', 'swe', '2026-06-24 20:00:00', 2.13, 4.00, 3.58, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-37', 'bel', 'egy', '2026-06-15 15:00:00', 2.17, 4.00, 3.47, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-38', 'irn', 'nzl', '2026-06-15 18:00:00', 1.38, 4.00, 25.00, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-39', 'bel', 'irn', '2026-06-20 15:00:00', 2.33, 4.00, 3.11, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-40', 'egy', 'nzl', '2026-06-20 18:00:00', 1.39, 4.00, 25.00, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-41', 'bel', 'nzl', '2026-06-25 16:00:00', 1.37, 4.00, 25.00, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-42', 'egy', 'irn', '2026-06-25 20:00:00', 2.93, 4.00, 2.44, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-43', 'esp', 'cpv', '2026-06-15 15:00:00', 1.53, 4.00, 10.29, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-44', 'ksa', 'uru', '2026-06-15 18:00:00', 5.00, 4.00, 1.82, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-45', 'esp', 'ksa', '2026-06-20 15:00:00', 1.67, 4.00, 6.56, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-46', 'cpv', 'uru', '2026-06-20 18:00:00', 7.62, 4.00, 1.62, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-47', 'esp', 'uru', '2026-06-25 16:00:00', 2.27, 4.00, 3.23, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-48', 'cpv', 'ksa', '2026-06-25 20:00:00', 3.62, 4.00, 2.11, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-49', 'fra', 'sen', '2026-06-16 15:00:00', 2.33, 4.00, 3.11, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-50', 'irq', 'nor', '2026-06-16 18:00:00', 3.03, 4.00, 2.38, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-51', 'fra', 'irq', '2026-06-21 15:00:00', 1.64, 4.00, 7.15, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-52', 'sen', 'nor', '2026-06-21 18:00:00', 1.85, 4.00, 4.76, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-53', 'fra', 'nor', '2026-06-26 16:00:00', 1.72, 4.00, 5.90, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-54', 'sen', 'irq', '2026-06-26 20:00:00', 1.74, 4.00, 5.70, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-55', 'arg', 'alg', '2026-06-16 15:00:00', 1.77, 4.00, 5.42, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-56', 'aut', 'jor', '2026-06-16 18:00:00', 1.52, 4.00, 11.00, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-57', 'arg', 'aut', '2026-06-21 15:00:00', 2.17, 4.00, 3.45, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-58', 'alg', 'jor', '2026-06-21 18:00:00', 1.69, 4.00, 6.33, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-59', 'arg', 'jor', '2026-06-26 16:00:00', 1.45, 4.00, 16.67, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-60', 'alg', 'aut', '2026-06-26 20:00:00', 3.91, 4.00, 2.02, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-61', 'por', 'cod', '2026-06-17 15:00:00', 1.61, 4.00, 7.85, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-62', 'uzb', 'col', '2026-06-17 18:00:00', 9.56, 4.00, 1.55, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-63', 'por', 'uzb', '2026-06-22 15:00:00', 1.52, 4.00, 11.11, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-64', 'cod', 'col', '2026-06-22 18:00:00', 6.81, 4.00, 1.66, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-65', 'por', 'col', '2026-06-27 16:00:00', 2.45, 4.00, 2.92, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-66', 'cod', 'uzb', '2026-06-27 20:00:00', 2.22, 4.00, 3.33, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-67', 'eng', 'cro', '2026-06-17 15:00:00', 2.46, 4.00, 2.91, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-68', 'gha', 'pan', '2026-06-17 18:00:00', 4.00, 4.00, 2.00, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-69', 'eng', 'gha', '2026-06-22 15:00:00', 1.57, 4.00, 8.83, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-70', 'cro', 'pan', '2026-06-22 18:00:00', 1.89, 4.00, 4.50, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-71', 'eng', 'pan', '2026-06-27 16:00:00', 1.81, 4.00, 5.08, 'scheduled', NULL, NULL, 0, 0, 0, TRUE),
('match-72', 'cro', 'gha', '2026-06-27 20:00:00', 1.61, 4.00, 7.67, 'scheduled', NULL, NULL, 0, 0, 0, TRUE);

-- Insert Seed Tournament Bets
INSERT INTO tournament_bets (id, question, kickoff_time, status, winning_option_id) VALUES
('t-bet-1', 'Who will lift the World Cup Trophy?', '2026-06-12 18:00:00', 'scheduled', NULL),
('t-bet-2', 'Which Group Winner prediction will succeed?', '2026-06-12 18:00:00', 'scheduled', NULL);

-- Insert Seed Tournament Bet Options
INSERT INTO tournament_bet_options (id, bet_id, label, odds) VALUES
('opt-arg', 't-bet-1', 'Argentina 🇦🇷', 4.50),
('opt-fra', 't-bet-1', 'France 🇫🇷', 5.00),
('opt-bra', 't-bet-1', 'Brazil 🇧🇷', 5.50),
('opt-esp', 't-bet-1', 'Spain 🇪🇸', 6.00),
('opt-eng', 't-bet-1', 'England 🏴󠁧󠁢󠁥󠁮󠁧󠁿', 6.50),
('opt-other', 't-bet-1', 'Other Underdog', 12.00),
('opt-grp-arg', 't-bet-2', 'Group A - Argentina', 1.30),
('opt-grp-fra', 't-bet-2', 'Group B - France', 1.45),
('opt-grp-bra', 't-bet-2', 'Group C - Brazil', 1.25),
('opt-grp-esp', 't-bet-2', 'Group D - Spain', 1.50);

