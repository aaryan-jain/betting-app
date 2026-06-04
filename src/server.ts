import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, '../dist')));

// Fallback all non-API requests to the React index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next(); // API 404s
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});


const PORT = process.env.PORT || 5000;

let pool: mysql.Pool;

// Calculate match winning/drawing odds according to the formula
function calculateMatchOdds(rankA: number, rankB: number) {
  const rA = Math.min(48, Math.max(1, rankA));
  const rB = Math.min(48, Math.max(1, rankB));

  const strengthA = (49 - rA) / 48;
  const strengthB = (49 - rB) / 48;

  const prob_ratio_A = strengthA / (strengthA + strengthB);

  const probA = prob_ratio_A * 0.75;
  const probDraw = 0.25;
  const probB = 0.75 - probA;

  const oddsA = Number((1 / probA).toFixed(2));
  const oddsB = Number((1 / probB).toFixed(2));
  const oddsDraw = Number((1 / probDraw).toFixed(2));

  return {
    home: Math.min(25, Math.max(1.1, oddsA)),
    draw: oddsDraw,
    away: Math.min(25, Math.max(1.1, oddsB)),
  };
}

function toMysqlDatetime(dateInput: Date | string): string {
  const date = new Date(dateInput);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// Recalculates 'matched' status of wagers for matches / tournament bets in a transaction
async function dbRecalculateWagerMatchStatus(connection: mysql.Connection, targetId: string, targetType: string): Promise<void> {
  const [wagers] = await connection.query(
    'SELECT id, prediction, status FROM wagers WHERE target_id = ? AND target_type = ? AND status IN (\'pending\', \'matched\')',
    [targetId, targetType]
  );

  const wagerList = wagers as any[];
  if (wagerList.length === 0) return;

  const predictions = new Set(wagerList.map((w) => w.prediction.toString()));
  const hasOpponents = predictions.size > 1;
  const nextStatus = hasOpponents ? 'matched' : 'pending';

  for (const wager of wagerList) {
    if (wager.status !== nextStatus) {
      await connection.query('UPDATE wagers SET status = ? WHERE id = ?', [nextStatus, wager.id]);
    }
  }
}

// Database Initialization & Seeding
async function initializeDatabase() {
  const dbName = process.env.DB_NAME || 'bettingcore';

  console.log(`Connecting to MySQL host ${process.env.DB_HOST || 'localhost'}...`);
  const initConnection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '12345678',
  });

  await initConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await initConnection.end();

  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '12345678',
    database: dbName,
    multipleStatements: true,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // Check if tables already exist by checking if 'users' table exists
  const [tables] = await pool.query(`
    SELECT COUNT(*) AS count 
    FROM information_schema.tables 
    WHERE table_schema = ? AND table_name = 'users'
  `, [dbName]);

  const exists = (tables as any)[0].count > 0;
  if (!exists) {
    console.log('Database tables not found. Running schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
    await pool.query(schemaSql);
    console.log('Database schema and seed data loaded successfully.');
  } else {
    console.log('Database tables already exist. Skipping schema.sql initialization.');
  }

  // Ensure system_settings table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key VARCHAR(50) PRIMARY KEY,
      setting_value TEXT NOT NULL
    )
  `);

  // Insert default system time if not exists
  await pool.query(`
    INSERT IGNORE INTO system_settings (setting_key, setting_value) 
    VALUES ('system_time', '2026-05-30T09:23:00Z')
  `);
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// DB INITIALIZATION / RESET
app.post('/api/init-db', async (req, res) => {
  try {
    const dbName = process.env.DB_NAME || 'bettingcore';
    console.log(`Resetting database ${dbName}...`);

    // Clear and run schema.sql
    const schemaSql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
    await pool.query(schemaSql);

    // Ensure system_settings table exists and reset time
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value TEXT NOT NULL
      )
    `);

    await pool.query(`
      INSERT INTO system_settings (setting_key, setting_value) 
      VALUES ('system_time', '2026-05-30T09:23:00Z')
      ON DUPLICATE KEY UPDATE setting_value = '2026-05-30T09:23:00Z'
    `);

    res.json({ success: true, message: 'Database reset to default seeding values' });
  } catch (error: any) {
    console.error('Error resetting database:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET SYSTEM TIME
app.get('/api/system-time', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT setting_value FROM system_settings WHERE setting_key = \'system_time\'');
    const systemTime = (rows as any)[0]?.setting_value || '2026-05-30T09:23:00Z';
    res.send(systemTime);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// SET SYSTEM TIME
app.post('/api/system-time', async (req, res) => {
  try {
    const { systemTime } = req.body;
    if (!systemTime) {
      return res.status(400).json({ error: 'systemTime is required' });
    }
    await pool.query(
      'INSERT INTO system_settings (setting_key, setting_value) VALUES (\'system_time\', ?) ON DUPLICATE KEY UPDATE setting_value = ?',
      [systemTime, systemTime]
    );
    res.send(systemTime);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET USERS (ordered by coins DESC, points DESC)
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, role, coins, points, joined_at AS joinedAt FROM users ORDER BY coins DESC, points DESC');
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET SINGLE USER
app.get('/api/users/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, role, coins, points, joined_at AS joinedAt FROM users WHERE id = ?', [req.params.id]);
    const user = (rows as any)[0] || null;
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// REGISTER USER
app.post('/api/users', async (req, res) => {
  try {
    const { username, startingCoins } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    const cleanUsername = username.trim();
    const [existing] = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [cleanUsername]);
    if ((existing as any).length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const id = `usr-${Date.now()}`;
    const role = cleanUsername.toLowerCase().includes('admin') ? 'admin' : 'user';
    const coins = startingCoins !== undefined ? startingCoins : 500;
    const joinedAt = toMysqlDatetime(new Date());

    await pool.query(
      'INSERT INTO users (id, username, role, coins, points, joined_at) VALUES (?, ?, ?, ?, 0, ?)',
      [id, cleanUsername, role, coins, joinedAt]
    );

    res.json({ id, username: cleanUsername, role, coins, points: 0, joinedAt });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE USER COINS
app.put('/api/users/:id/coins', async (req, res) => {
  try {
    const { coins } = req.body;
    const amount = Math.max(0, coins);
    await pool.query('UPDATE users SET coins = ? WHERE id = ?', [amount, req.params.id]);

    const [rows] = await pool.query('SELECT id, username, role, coins, points, joined_at AS joinedAt FROM users WHERE id = ?', [req.params.id]);
    const user = (rows as any)[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE USER POINTS
app.put('/api/users/:id/points', async (req, res) => {
  try {
    const { points } = req.body;
    const amount = Math.max(0, points);
    await pool.query('UPDATE users SET points = ? WHERE id = ?', [amount, req.params.id]);

    const [rows] = await pool.query('SELECT id, username, role, coins, points, joined_at AS joinedAt FROM users WHERE id = ?', [req.params.id]);
    const user = (rows as any)[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET MATCHES
app.get('/api/matches', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        m.id,
        m.team_a_id AS teamAId,
        m.team_b_id AS teamBId,
        ta.name AS teamAName,
        tb.name AS teamBName,
        ta.emoji AS teamAEmoji,
        tb.emoji AS teamBEmoji,
        ta.fifarank AS teamARank,
        tb.fifarank AS teamBRank,
        m.kickoff_time AS kickoffTime,
        m.odds_home AS oddsHome,
        m.odds_draw AS oddsDraw,
        m.odds_away AS oddsAway,
        m.status,
        m.score_a AS scoreA,
        m.score_b AS scoreB,
        m.votes_home AS votesHome,
        m.votes_draw AS votesDraw,
        m.votes_away AS votesAway,
        m.is_auto_created AS isAutoCreated
      FROM matches m
      JOIN teams ta ON m.team_a_id = ta.id
      JOIN teams tb ON m.team_b_id = tb.id
      ORDER BY m.kickoff_time ASC
    `);

    const matches = (rows as any[]).map((row) => ({
      id: row.id,
      teamAId: row.teamAId,
      teamBId: row.teamBId,
      teamAName: row.teamAName,
      teamBName: row.teamBName,
      teamAEmoji: row.teamAEmoji,
      teamBEmoji: row.teamBEmoji,
      teamARank: row.teamARank,
      teamBRank: row.teamBRank,
      kickoffTime: new Date(row.kickoffTime).toISOString(),
      odds: {
        home: Number(row.oddsHome),
        draw: Number(row.oddsDraw),
        away: Number(row.oddsAway),
      },
      status: row.status,
      scoreA: row.scoreA,
      scoreB: row.scoreB,
      votes: {
        home: row.votesHome || 0,
        draw: row.votesDraw || 0,
        away: row.votesAway || 0,
      },
      isAutoCreated: Boolean(row.isAutoCreated),
    }));

    res.json(matches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE MATCH
app.post('/api/matches', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { teamAName, teamBName, teamAEmoji, teamBEmoji, teamARank, teamBRank, kickoffTime } = req.body;

    // Resolve or insert Team A
    let teamAId = teamAName.substring(0, 3).toLowerCase();
    const [existingA] = await connection.query('SELECT id FROM teams WHERE name = ?', [teamAName]);
    if ((existingA as any).length > 0) {
      teamAId = (existingA as any)[0].id;
    } else {
      // Ensure unique teamAId
      const [colA] = await connection.query('SELECT id FROM teams WHERE id = ?', [teamAId]);
      if ((colA as any).length > 0) {
        teamAId = `t-${Date.now()}-${Math.floor(Math.random() * 100)}`;
      }
      await connection.query(
        'INSERT INTO teams (id, name, emoji, fifarank) VALUES (?, ?, ?, ?)',
        [teamAId, teamAName, teamAEmoji, teamARank]
      );
    }

    // Resolve or insert Team B
    let teamBId = teamBName.substring(0, 3).toLowerCase();
    const [existingB] = await connection.query('SELECT id FROM teams WHERE name = ?', [teamBName]);
    if ((existingB as any).length > 0) {
      teamBId = (existingB as any)[0].id;
    } else {
      // Ensure unique teamBId
      const [colB] = await connection.query('SELECT id FROM teams WHERE id = ?', [teamBId]);
      if ((colB as any).length > 0) {
        teamBId = `t-${Date.now()}-${Math.floor(Math.random() * 100)}`;
      }
      await connection.query(
        'INSERT INTO teams (id, name, emoji, fifarank) VALUES (?, ?, ?, ?)',
        [teamBId, teamBName, teamBEmoji, teamBRank]
      );
    }

    const odds = calculateMatchOdds(teamARank, teamBRank);
    const id = `match-${Date.now()}`;

    await connection.query(`
      INSERT INTO matches (
        id, team_a_id, team_b_id, kickoff_time, 
        odds_home, odds_draw, odds_away, status, 
        score_a, score_b, votes_home, votes_draw, votes_away, is_auto_created
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', NULL, NULL, 0, 0, 0, FALSE)
    `, [id, teamAId, teamBId, toMysqlDatetime(kickoffTime), odds.home, odds.draw, odds.away]);

    await connection.commit();

    // Query back the newly created match joined with teams
    const [rows] = await pool.query(`
      SELECT 
        m.id,
        m.team_a_id AS teamAId,
        m.team_b_id AS teamBId,
        ta.name AS teamAName,
        tb.name AS teamBName,
        ta.emoji AS teamAEmoji,
        tb.emoji AS teamBEmoji,
        ta.fifarank AS teamARank,
        tb.fifarank AS teamBRank,
        m.kickoff_time AS kickoffTime,
        m.odds_home AS oddsHome,
        m.odds_draw AS oddsDraw,
        m.odds_away AS oddsAway,
        m.status,
        m.score_a AS scoreA,
        m.score_b AS scoreB,
        m.votes_home AS votesHome,
        m.votes_draw AS votesDraw,
        m.votes_away AS votesAway,
        m.is_auto_created AS isAutoCreated
      FROM matches m
      JOIN teams ta ON m.team_a_id = ta.id
      JOIN teams tb ON m.team_b_id = tb.id
      WHERE m.id = ?
    `, [id]);

    const row = (rows as any)[0];
    const match = {
      id: row.id,
      teamAId: row.teamAId,
      teamBId: row.teamBId,
      teamAName: row.teamAName,
      teamBName: row.teamBName,
      teamAEmoji: row.teamAEmoji,
      teamBEmoji: row.teamBEmoji,
      teamARank: row.teamARank,
      teamBRank: row.teamBRank,
      kickoffTime: new Date(row.kickoffTime).toISOString(),
      odds: {
        home: Number(row.oddsHome),
        draw: Number(row.oddsDraw),
        away: Number(row.oddsAway),
      },
      status: row.status,
      scoreA: row.scoreA,
      scoreB: row.scoreB,
      votes: {
        home: row.votesHome || 0,
        draw: row.votesDraw || 0,
        away: row.votesAway || 0,
      },
      isAutoCreated: Boolean(row.isAutoCreated),
    };

    res.json(match);
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// UPDATE MATCH ODDS
app.post('/api/matches/:id/odds', async (req, res) => {
  try {
    const { customOdds } = req.body;
    const { home, draw, away } = customOdds || req.body;
    await pool.query('UPDATE matches SET odds_home = ?, odds_draw = ?, odds_away = ? WHERE id = ?', [home, draw, away, req.params.id]);

    const [rows] = await pool.query(`
      SELECT 
        m.id,
        m.team_a_id AS teamAId,
        m.team_b_id AS teamBId,
        ta.name AS teamAName,
        tb.name AS teamBName,
        ta.emoji AS teamAEmoji,
        tb.emoji AS teamBEmoji,
        ta.fifarank AS teamARank,
        tb.fifarank AS teamBRank,
        m.kickoff_time AS kickoffTime,
        m.odds_home AS oddsHome,
        m.odds_draw AS oddsDraw,
        m.odds_away AS oddsAway,
        m.status,
        m.score_a AS scoreA,
        m.score_b AS scoreB,
        m.votes_home AS votesHome,
        m.votes_draw AS votesDraw,
        m.votes_away AS votesAway,
        m.is_auto_created AS isAutoCreated
      FROM matches m
      JOIN teams ta ON m.team_a_id = ta.id
      JOIN teams tb ON m.team_b_id = tb.id
      WHERE m.id = ?
    `, [req.params.id]);

    const row = (rows as any)[0];
    if (!row) return res.status(404).json({ error: 'Match not found' });
    const match = {
      id: row.id,
      teamAId: row.teamAId,
      teamBId: row.teamBId,
      teamAName: row.teamAName,
      teamBName: row.teamBName,
      teamAEmoji: row.teamAEmoji,
      teamBEmoji: row.teamBEmoji,
      teamARank: row.teamARank,
      teamBRank: row.teamBRank,
      kickoffTime: new Date(row.kickoffTime).toISOString(),
      odds: {
        home: Number(row.oddsHome),
        draw: Number(row.oddsDraw),
        away: Number(row.oddsAway),
      },
      status: row.status,
      scoreA: row.scoreA,
      scoreB: row.scoreB,
      votes: {
        home: row.votesHome || 0,
        draw: row.votesDraw || 0,
        away: row.votesAway || 0,
      },
      isAutoCreated: Boolean(row.isAutoCreated),
    };
    res.json(match);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE LIVE SCORE & STATUS
app.post('/api/matches/:id/live', async (req, res) => {
  try {
    const { status, scoreA, scoreB } = req.body;
    await pool.query('UPDATE matches SET status = ?, score_a = ?, score_b = ? WHERE id = ?', [status, scoreA, scoreB, req.params.id]);

    const [rows] = await pool.query(`
      SELECT 
        m.id,
        m.team_a_id AS teamAId,
        m.team_b_id AS teamBId,
        ta.name AS teamAName,
        tb.name AS teamBName,
        ta.emoji AS teamAEmoji,
        tb.emoji AS teamBEmoji,
        ta.fifarank AS teamARank,
        tb.fifarank AS teamBRank,
        m.kickoff_time AS kickoffTime,
        m.odds_home AS oddsHome,
        m.odds_draw AS oddsDraw,
        m.odds_away AS oddsAway,
        m.status,
        m.score_a AS scoreA,
        m.score_b AS scoreB,
        m.votes_home AS votesHome,
        m.votes_draw AS votesDraw,
        m.votes_away AS votesAway,
        m.is_auto_created AS isAutoCreated
      FROM matches m
      JOIN teams ta ON m.team_a_id = ta.id
      JOIN teams tb ON m.team_b_id = tb.id
      WHERE m.id = ?
    `, [req.params.id]);

    const row = (rows as any)[0];
    if (!row) return res.status(404).json({ error: 'Match not found' });
    const match = {
      id: row.id,
      teamAId: row.teamAId,
      teamBId: row.teamBId,
      teamAName: row.teamAName,
      teamBName: row.teamBName,
      teamAEmoji: row.teamAEmoji,
      teamBEmoji: row.teamBEmoji,
      teamARank: row.teamARank,
      teamBRank: row.teamBRank,
      kickoffTime: new Date(row.kickoffTime).toISOString(),
      odds: {
        home: Number(row.oddsHome),
        draw: Number(row.oddsDraw),
        away: Number(row.oddsAway),
      },
      status: row.status,
      scoreA: row.scoreA,
      scoreB: row.scoreB,
      votes: {
        home: row.votesHome || 0,
        draw: row.votesDraw || 0,
        away: row.votesAway || 0,
      },
      isAutoCreated: Boolean(row.isAutoCreated),
    };
    res.json(match);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// SUBMIT COMMUNITY VOTE
app.post('/api/matches/:id/vote', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { userId, prediction } = req.body;
    const matchId = req.params.id;

    // Check if vote exists
    const [existing] = await connection.query(
      'SELECT prediction FROM community_votes WHERE user_id = ? AND match_id = ?',
      [userId, matchId]
    );

    const existList = existing as any[];

    if (existList.length > 0) {
      const prevPrediction = existList[0].prediction;
      if (prevPrediction !== prediction) {
        // Update vote
        await connection.query(
          'UPDATE community_votes SET prediction = ? WHERE user_id = ? AND match_id = ?',
          [prediction, userId, matchId]
        );

        // Adjust counts on matches
        await connection.query(
          `UPDATE matches 
           SET votes_${prevPrediction} = GREATEST(0, votes_${prevPrediction} - 1),
               votes_${prediction} = votes_${prediction} + 1 
           WHERE id = ?`,
          [matchId]
        );
      }
    } else {
      // Create vote
      const voteId = `cv-${Date.now()}`;
      await connection.query(
        'INSERT INTO community_votes (id, user_id, match_id, prediction) VALUES (?, ?, ?, ?)',
        [voteId, userId, matchId, prediction]
      );

      // Increment count on matches
      await connection.query(
        `UPDATE matches SET votes_${prediction} = votes_${prediction} + 1 WHERE id = ?`,
        [matchId]
      );
    }

    await connection.commit();

    // Query updated match back
    const [rows] = await pool.query(`
      SELECT 
        m.id,
        m.team_a_id AS teamAId,
        m.team_b_id AS teamBId,
        ta.name AS teamAName,
        tb.name AS teamBName,
        ta.emoji AS teamAEmoji,
        tb.emoji AS teamBEmoji,
        ta.fifarank AS teamARank,
        tb.fifarank AS teamBRank,
        m.kickoff_time AS kickoffTime,
        m.odds_home AS oddsHome,
        m.odds_draw AS oddsDraw,
        m.odds_away AS oddsAway,
        m.status,
        m.score_a AS scoreA,
        m.score_b AS scoreB,
        m.votes_home AS votesHome,
        m.votes_draw AS votesDraw,
        m.votes_away AS votesAway,
        m.is_auto_created AS isAutoCreated
      FROM matches m
      JOIN teams ta ON m.team_a_id = ta.id
      JOIN teams tb ON m.team_b_id = tb.id
      WHERE m.id = ?
    `, [matchId]);

    const row = (rows as any)[0];
    const match = {
      id: row.id,
      teamAId: row.teamAId,
      teamBId: row.teamBId,
      teamAName: row.teamAName,
      teamBName: row.teamBName,
      teamAEmoji: row.teamAEmoji,
      teamBEmoji: row.teamBEmoji,
      teamARank: row.teamARank,
      teamBRank: row.teamBRank,
      kickoffTime: new Date(row.kickoffTime).toISOString(),
      odds: {
        home: Number(row.oddsHome),
        draw: Number(row.oddsDraw),
        away: Number(row.oddsAway),
      },
      status: row.status,
      scoreA: row.scoreA,
      scoreB: row.scoreB,
      votes: {
        home: row.votesHome || 0,
        draw: row.votesDraw || 0,
        away: row.votesAway || 0,
      },
      isAutoCreated: Boolean(row.isAutoCreated),
    };

    res.json(match);
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// GET TOURNAMENT BETS
app.get('/api/tournament-bets', async (req, res) => {
  try {
    const [bets] = await pool.query('SELECT id, question, kickoff_time AS kickoffTime, status, winning_option_id AS winningOptionId FROM tournament_bets ORDER BY kickoffTime ASC');
    const [options] = await pool.query('SELECT id, bet_id AS betId, label, odds FROM tournament_bet_options');

    const optionsMap: { [key: string]: any[] } = {};
    (options as any[]).forEach((opt) => {
      if (!optionsMap[opt.betId]) {
        optionsMap[opt.betId] = [];
      }
      optionsMap[opt.betId].push({
        id: opt.id,
        label: opt.label,
        odds: Number(opt.odds),
      });
    });

    const result = (bets as any[]).map((bet) => ({
      id: bet.id,
      question: bet.question,
      kickoffTime: new Date(bet.kickoffTime).toISOString(),
      status: bet.status,
      winningOptionId: bet.winningOptionId,
      options: optionsMap[bet.id] || [],
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE TOURNAMENT BET
app.post('/api/tournament-bets', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { question, options, kickoffTime } = req.body;
    const betId = `t-bet-${Date.now()}`;

    await connection.query(
      'INSERT INTO tournament_bets (id, question, kickoff_time, status, winning_option_id) VALUES (?, ?, ?, \'scheduled\', NULL)',
      [betId, question, toMysqlDatetime(kickoffTime)]
    );

    const insertedOptions: any[] = [];
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const optId = `opt-${Date.now()}-${i}`;
      await connection.query(
        'INSERT INTO tournament_bet_options (id, bet_id, label, odds) VALUES (?, ?, ?, ?)',
        [optId, betId, opt.label, opt.odds]
      );
      insertedOptions.push({
        id: optId,
        label: opt.label,
        odds: Number(opt.odds),
      });
    }

    await connection.commit();

    res.json({
      id: betId,
      question,
      kickoffTime: new Date(kickoffTime).toISOString(),
      status: 'scheduled',
      winningOptionId: null,
      options: insertedOptions,
    });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// GET WAGERS
app.get('/api/wagers', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        w.id,
        w.user_id AS userId,
        u.username AS userUsername,
        w.target_id AS targetId,
        w.target_type AS targetType,
        w.prediction,
        w.exact_score_a AS exactScoreA,
        w.exact_score_b AS exactScoreB,
        w.amount,
        w.status,
        w.odds_at_wager AS oddsAtWager,
        w.payout_points AS payoutPoints,
        w.payout_coins AS payoutCoins,
        w.created_at AS createdAt,
        w.resolved_at AS resolvedAt
      FROM wagers w
      JOIN users u ON w.user_id = u.id
      ORDER BY w.created_at DESC
    `);

    const wagers = (rows as any[]).map((row) => ({
      id: row.id,
      userId: row.userId,
      userUsername: row.userUsername,
      targetId: row.targetId,
      targetType: row.targetType,
      prediction: row.prediction,
      exactScoreA: row.exactScoreA !== null ? row.exactScoreA : undefined,
      exactScoreB: row.exactScoreB !== null ? row.exactScoreB : undefined,
      amount: row.amount,
      status: row.status,
      oddsAtWager: Number(row.oddsAtWager),
      payoutPoints: row.payoutPoints,
      payoutCoins: row.payoutCoins,
      createdAt: new Date(row.createdAt).toISOString(),
      resolvedAt: row.resolvedAt ? new Date(row.resolvedAt).toISOString() : undefined,
    }));

    res.json(wagers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PLACE WAGER
app.post('/api/wagers', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { userId, targetId, targetType, prediction, amount, odds, scoreA, scoreB } = req.body;

    // Check user coins
    const [userRows] = await connection.query('SELECT coins, username FROM users WHERE id = ? FOR UPDATE', [userId]);
    const user = (userRows as any)[0];
    if (!user) {
      throw new Error('User not found');
    }
    if (user.coins < amount) {
      throw new Error('Insufficient coins');
    }

    // Get system time
    const [timeRows] = await connection.query('SELECT setting_value FROM system_settings WHERE setting_key = \'system_time\'');
    const systemTimeStr = (timeRows as any)[0]?.setting_value || '2026-05-30T09:23:00Z';
    const sysTime = new Date(systemTimeStr).getTime();

    // Check lock status
    if (targetType === 'match_outcome' || targetType === 'match_score') {
      const [matchRows] = await connection.query('SELECT kickoff_time, status FROM matches WHERE id = ?', [targetId]);
      const match = (matchRows as any)[0];
      if (!match) throw new Error('Match not found');
      if (new Date(match.kickoff_time).getTime() <= sysTime) {
        throw new Error('This match has already kicked off. Betting is locked!');
      }
      if (match.status !== 'scheduled') {
        throw new Error('This match has already started or completed.');
      }
    } else {
      const [betRows] = await connection.query('SELECT kickoff_time, status FROM tournament_bets WHERE id = ?', [targetId]);
      const bet = (betRows as any)[0];
      if (!bet) throw new Error('Tournament bet not found');
      if (new Date(bet.kickoff_time).getTime() <= sysTime) {
        throw new Error('This tournament bet has already reached its deadline.');
      }
      if (bet.status !== 'scheduled') {
        throw new Error('This tournament bet is locked or resolved.');
      }
    }

    // Deduct coins
    await connection.query('UPDATE users SET coins = coins - ? WHERE id = ?', [amount, userId]);

    // Create wager
    const wagerId = `wag-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const createdAt = toMysqlDatetime(new Date());

    await connection.query(`
      INSERT INTO wagers (
        id, user_id, target_id, target_type, prediction, 
        exact_score_a, exact_score_b, amount, status, 
        odds_at_wager, payout_points, payout_coins, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 0, 0, ?)
    `, [
      wagerId, userId, targetId, targetType, prediction,
      scoreA !== undefined ? scoreA : null,
      scoreB !== undefined ? scoreB : null,
      amount, odds, createdAt
    ]);

    // Recalculate status for this target
    await dbRecalculateWagerMatchStatus(connection, targetId, targetType);

    await connection.commit();

    res.json({
      id: wagerId,
      userId,
      userUsername: user.username,
      targetId,
      targetType,
      prediction,
      exactScoreA: scoreA,
      exactScoreB: scoreB,
      amount,
      status: 'pending', // recalculate might have changed this, we will query it back or return mapped
      oddsAtWager: odds,
      payoutPoints: 0,
      payoutCoins: 0,
      createdAt,
    });
  } catch (error: any) {
    await connection.rollback();
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// CANCEL WAGER
app.post('/api/wagers/:id/cancel', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const wagerId = req.params.id;

    // Get wager
    const [wRows] = await connection.query('SELECT * FROM wagers WHERE id = ? FOR UPDATE', [wagerId]);
    const wager = (wRows as any)[0];
    if (!wager) throw new Error('Wager not found');
    if (wager.status !== 'pending') {
      throw new Error('Only pending wagers can be cancelled');
    }

    // Get system time
    const [timeRows] = await connection.query('SELECT setting_value FROM system_settings WHERE setting_key = \'system_time\'');
    const systemTimeStr = (timeRows as any)[0]?.setting_value || '2026-05-30T09:23:00Z';
    const sysTime = new Date(systemTimeStr).getTime();

    // Check deadlines
    if (wager.target_type === 'match_outcome' || wager.target_type === 'match_score') {
      const [mRows] = await connection.query('SELECT kickoff_time FROM matches WHERE id = ?', [wager.target_id]);
      const match = (mRows as any)[0];
      if (match && new Date(match.kickoff_time).getTime() <= sysTime) {
        throw new Error('Match has started! Wager is locked and cannot be cancelled');
      }
    } else {
      const [tRows] = await connection.query('SELECT kickoff_time FROM tournament_bets WHERE id = ?', [wager.target_id]);
      const bet = (tRows as any)[0];
      if (bet && new Date(bet.kickoff_time).getTime() <= sysTime) {
        throw new Error('Deadline passed! Wager is locked and cannot be cancelled');
      }
    }

    // Refund coins
    await connection.query('UPDATE users SET coins = coins + ? WHERE id = ?', [wager.amount, wager.user_id]);

    // Delete wager
    await connection.query('DELETE FROM wagers WHERE id = ?', [wagerId]);

    // Recalculate status for other wagers of this target
    await dbRecalculateWagerMatchStatus(connection, wager.target_id, wager.target_type);

    await connection.commit();

    res.json({ success: true, returnedCoins: wager.amount });
  } catch (error: any) {
    await connection.rollback();
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// RESOLVE MATCH (resolving outcomes and payouts)
app.post('/api/matches/:id/resolve', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const matchId = req.params.id;
    const { scoreA, scoreB, status } = req.body;

    // Update match
    await connection.query(
      'UPDATE matches SET score_a = ?, score_b = ?, status = ? WHERE id = ?',
      [scoreA, scoreB, status, matchId]
    );

    if (status === 'completed') {
      let outcome: 'home' | 'draw' | 'away' = 'draw';
      if (scoreA > scoreB) outcome = 'home';
      else if (scoreB > scoreA) outcome = 'away';

      const exactScoreString = `${scoreA}-${scoreB}`;

      // Get match wagers
      const [mWagers] = await connection.query(
        'SELECT * FROM wagers WHERE target_id = ? AND status IN (\'pending\', \'matched\') FOR UPDATE',
        [matchId]
      );

      const matchWagers = mWagers as any[];

      // Find admin user
      const [adminRows] = await connection.query('SELECT id FROM users WHERE role = \'admin\' LIMIT 1');
      let adminUser = (adminRows as any)[0];
      if (!adminUser) {
        const [fallbackRows] = await connection.query('SELECT id FROM users LIMIT 1');
        adminUser = (fallbackRows as any)[0];
      }

      // RESOLVE OUTCOME WAGERS
      const outcomeWagers = matchWagers.filter((w) => w.target_type === 'match_outcome');
      const outcomePredictions = new Set(outcomeWagers.map((w) => w.prediction));
      const isOutcomeValid = outcomePredictions.size > 1;

      if (outcomeWagers.length > 0) {
        if (!isOutcomeValid) {
          // Refund (no opponents)
          for (const w of outcomeWagers) {
            await connection.query('UPDATE wagers SET status = \'cancelled\', resolved_at = NOW() WHERE id = ?', [w.id]);
            await connection.query('UPDATE users SET coins = coins + ? WHERE id = ?', [w.amount, w.user_id]);
          }
        } else {
          const winners = outcomeWagers.filter((w) => w.prediction === outcome);
          const losers = outcomeWagers.filter((w) => w.prediction !== outcome);

          if (winners.length === 0) {
            // No winners. 50% admin cut, refund rest
            for (const w of outcomeWagers) {
              const adminCut = Math.floor(w.amount * 0.5);
              const refundAmount = w.amount - adminCut;
              await connection.query('UPDATE wagers SET status = \'cancelled\', payout_coins = ?, resolved_at = NOW() WHERE id = ?', [refundAmount, w.id]);
              await connection.query('UPDATE users SET coins = coins + ? WHERE id = ?', [refundAmount, w.user_id]);
              if (adminUser) {
                await connection.query('UPDATE users SET coins = coins + ? WHERE id = ?', [adminCut, adminUser.id]);
              }
            }
          } else {
            const totalOutcomePool = outcomeWagers.reduce((sum, w) => sum + w.amount, 0);
            const adminCommission = Math.floor(totalOutcomePool * 0.10);
            const winnerDistributionPool = totalOutcomePool - adminCommission;

            if (adminUser) {
              await connection.query('UPDATE users SET coins = coins + ? WHERE id = ?', [adminCommission, adminUser.id]);
            }

            const totalWinningWager = winners.reduce((sum, w) => sum + w.amount, 0);

            for (const w of winners) {
              const payoutCoins = Math.floor((w.amount / totalWinningWager) * winnerDistributionPool);
              const payoutPoints = 3;
              await connection.query(
                'UPDATE wagers SET status = \'resolved\', payout_coins = ?, payout_points = ?, resolved_at = NOW() WHERE id = ?',
                [payoutCoins, payoutPoints, w.id]
              );
              await connection.query('UPDATE users SET coins = coins + ?, points = points + ? WHERE id = ?', [payoutCoins, payoutPoints, w.user_id]);
            }

            for (const w of losers) {
              await connection.query(
                'UPDATE wagers SET status = \'resolved\', payout_coins = 0, payout_points = 0, resolved_at = NOW() WHERE id = ?',
                [w.id]
              );
            }
          }
        }
      }

      // RESOLVE EXACT SCORE WAGERS
      const scoreWagers = matchWagers.filter((w) => w.target_type === 'match_score');
      const scorePredictions = new Set(scoreWagers.map((w) => w.prediction));
      const isScoreValid = scorePredictions.size > 1;

      if (scoreWagers.length > 0) {
        if (!isScoreValid) {
          for (const w of scoreWagers) {
            await connection.query('UPDATE wagers SET status = \'cancelled\', resolved_at = NOW() WHERE id = ?', [w.id]);
            await connection.query('UPDATE users SET coins = coins + ? WHERE id = ?', [w.amount, w.user_id]);
          }
        } else {
          const winners = scoreWagers.filter((w) => w.prediction === exactScoreString);
          const losers = scoreWagers.filter((w) => w.prediction !== exactScoreString);

          if (winners.length === 0) {
            for (const w of scoreWagers) {
              const adminCut = Math.floor(w.amount * 0.5);
              const refundAmount = w.amount - adminCut;
              await connection.query('UPDATE wagers SET status = \'cancelled\', payout_coins = ?, resolved_at = NOW() WHERE id = ?', [refundAmount, w.id]);
              await connection.query('UPDATE users SET coins = coins + ? WHERE id = ?', [refundAmount, w.user_id]);
              if (adminUser) {
                await connection.query('UPDATE users SET coins = coins + ? WHERE id = ?', [adminCut, adminUser.id]);
              }
            }
          } else {
            const totalScorePool = scoreWagers.reduce((sum, w) => sum + w.amount, 0);
            const adminCommission = Math.floor(totalScorePool * 0.10);
            const winnerDistributionPool = totalScorePool - adminCommission;

            if (adminUser) {
              await connection.query('UPDATE users SET coins = coins + ? WHERE id = ?', [adminCommission, adminUser.id]);
            }

            const totalWinningWager = winners.reduce((sum, w) => sum + w.amount, 0);

            for (const w of winners) {
              const payoutCoins = Math.floor((w.amount / totalWinningWager) * winnerDistributionPool);
              const payoutPoints = 6;
              await connection.query(
                'UPDATE wagers SET status = \'resolved\', payout_coins = ?, payout_points = ?, resolved_at = NOW() WHERE id = ?',
                [payoutCoins, payoutPoints, w.id]
              );
              await connection.query('UPDATE users SET coins = coins + ?, points = points + ? WHERE id = ?', [payoutCoins, payoutPoints, w.user_id]);
            }

            for (const w of losers) {
              await connection.query(
                'UPDATE wagers SET status = \'resolved\', payout_coins = 0, payout_points = 0, resolved_at = NOW() WHERE id = ?',
                [w.id]
              );
            }
          }
        }
      }
    }

    await connection.commit();

    // Query resolved match back joined with teams
    const [rows] = await pool.query(`
      SELECT 
        m.id,
        m.team_a_id AS teamAId,
        m.team_b_id AS teamBId,
        ta.name AS teamAName,
        tb.name AS teamBName,
        ta.emoji AS teamAEmoji,
        tb.emoji AS teamBEmoji,
        ta.fifarank AS teamARank,
        tb.fifarank AS teamBRank,
        m.kickoff_time AS kickoffTime,
        m.odds_home AS oddsHome,
        m.odds_draw AS oddsDraw,
        m.odds_away AS oddsAway,
        m.status,
        m.score_a AS scoreA,
        m.score_b AS scoreB,
        m.votes_home AS votesHome,
        m.votes_draw AS votesDraw,
        m.votes_away AS votesAway,
        m.is_auto_created AS isAutoCreated
      FROM matches m
      JOIN teams ta ON m.team_a_id = ta.id
      JOIN teams tb ON m.team_b_id = tb.id
      WHERE m.id = ?
    `, [matchId]);

    const row = (rows as any)[0];
    const match = {
      id: row.id,
      teamAId: row.teamAId,
      teamBId: row.teamBId,
      teamAName: row.teamAName,
      teamBName: row.teamBName,
      teamAEmoji: row.teamAEmoji,
      teamBEmoji: row.teamBEmoji,
      teamARank: row.teamARank,
      teamBRank: row.teamBRank,
      kickoffTime: new Date(row.kickoffTime).toISOString(),
      odds: {
        home: Number(row.oddsHome),
        draw: Number(row.oddsDraw),
        away: Number(row.oddsAway),
      },
      status: row.status,
      scoreA: row.scoreA,
      scoreB: row.scoreB,
      votes: {
        home: row.votesHome || 0,
        draw: row.votesDraw || 0,
        away: row.votesAway || 0,
      },
      isAutoCreated: Boolean(row.isAutoCreated),
    };

    res.json(match);
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// RESOLVE TOURNAMENT BET (resolving outcomes and payouts)
app.post('/api/tournament-bets/:id/resolve', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const betId = req.params.id;
    const { winningOptionId } = req.body;

    // Update bet status
    await connection.query(
      'UPDATE tournament_bets SET winning_option_id = ?, status = \'completed\' WHERE id = ?',
      [winningOptionId, betId]
    );

    // Get bet question
    const [betRows] = await connection.query('SELECT question FROM tournament_bets WHERE id = ?', [betId]);
    const bet = (betRows as any)[0];
    if (!bet) throw new Error('Tournament bet not found');

    let pointsAwarded = 4;
    const questionLower = bet.question.toLowerCase();
    if (questionLower.includes('trophy') || questionLower.includes('winner of tour')) {
      pointsAwarded = 10;
    } else if (questionLower.includes('knockout')) {
      pointsAwarded = 2;
    }

    // Get wagers
    const [tWagers] = await connection.query(
      'SELECT * FROM wagers WHERE target_id = ? AND status IN (\'pending\', \'matched\') FOR UPDATE',
      [betId]
    );
    const targetWagers = tWagers as any[];

    // Find admin user
    const [adminRows] = await connection.query('SELECT id FROM users WHERE role = \'admin\' LIMIT 1');
    let adminUser = (adminRows as any)[0];
    if (!adminUser) {
      const [fallbackRows] = await connection.query('SELECT id FROM users LIMIT 1');
      adminUser = (fallbackRows as any)[0];
    }

    const uniquePredictions = new Set(targetWagers.map((w) => w.prediction));
    const isValid = uniquePredictions.size > 1;

    if (targetWagers.length > 0) {
      if (!isValid) {
        for (const w of targetWagers) {
          await connection.query('UPDATE wagers SET status = \'cancelled\', resolved_at = NOW() WHERE id = ?', [w.id]);
          await connection.query('UPDATE users SET coins = coins + ? WHERE id = ?', [w.amount, w.user_id]);
        }
      } else {
        const winners = targetWagers.filter((w) => w.prediction === winningOptionId);
        const losers = targetWagers.filter((w) => w.prediction !== winningOptionId);

        if (winners.length === 0) {
          for (const w of targetWagers) {
            const adminCut = Math.floor(w.amount * 0.5);
            const refundAmount = w.amount - adminCut;
            await connection.query('UPDATE wagers SET status = \'resolved\', payout_coins = ?, resolved_at = NOW() WHERE id = ?', [refundAmount, w.id]);
            await connection.query('UPDATE users SET coins = coins + ? WHERE id = ?', [refundAmount, w.user_id]);
            if (adminUser) {
              await connection.query('UPDATE users SET coins = coins + ? WHERE id = ?', [adminCut, adminUser.id]);
            }
          }
        } else {
          const totalPool = targetWagers.reduce((sum, w) => sum + w.amount, 0);
          const adminCommission = Math.floor(totalPool * 0.10);
          const winnerDistributionPool = totalPool - adminCommission;

          if (adminUser) {
            await connection.query('UPDATE users SET coins = coins + ? WHERE id = ?', [adminCommission, adminUser.id]);
          }

          const totalWinningWager = winners.reduce((sum, w) => sum + w.amount, 0);

          for (const w of winners) {
            const payoutCoins = Math.floor((w.amount / totalWinningWager) * winnerDistributionPool);
            await connection.query(
              'UPDATE wagers SET status = \'resolved\', payout_coins = ?, payout_points = ?, resolved_at = NOW() WHERE id = ?',
              [payoutCoins, pointsAwarded, w.id]
            );
            await connection.query('UPDATE users SET coins = coins + ?, points = points + ? WHERE id = ?', [payoutCoins, pointsAwarded, w.user_id]);
          }

          for (const w of losers) {
            await connection.query(
              'UPDATE wagers SET status = \'resolved\', payout_coins = 0, payout_points = 0, resolved_at = NOW() WHERE id = ?',
              [w.id]
            );
          }
        }
      }
    }

    await connection.commit();

    // Query back resolved bet
    const [updatedBets] = await pool.query('SELECT id, question, kickoff_time AS kickoffTime, status, winning_option_id AS winningOptionId FROM tournament_bets WHERE id = ?', [betId]);
    const [updatedOptions] = await pool.query('SELECT id, bet_id AS betId, label, odds FROM tournament_bet_options WHERE bet_id = ?', [betId]);

    const finalBet = (updatedBets as any[])[0];
    const result = {
      id: finalBet.id,
      question: finalBet.question,
      kickoffTime: new Date(finalBet.kickoffTime).toISOString(),
      status: finalBet.status,
      winningOptionId: finalBet.winningOptionId,
      options: (updatedOptions as any[]).map((opt) => ({
        id: opt.id,
        label: opt.label,
        odds: Number(opt.odds),
      })),
    };

    res.json(result);
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// START SERVER AFTER INITIALIZING DATABASE
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database pool:', err);
    process.exit(1);
  });
