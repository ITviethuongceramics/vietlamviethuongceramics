require('dotenv').config();
const db = require('./data/db.js');
const { generateSummary } = require('./services/gradingService');

async function syncAllAiSummaries() {
  console.log('🚀 STARTING AI SUMMARY BACKFILL FOR HISTORICAL TEST RESULTS...');
  
  const [rows] = await db.query(`
    SELECT 
      tr.id AS result_id,
      tr.assignment_id,
      tr.total_score,
      tr.max_score,
      tr.percentage,
      tr.passed,
      tr.ai_summary,
      a.full_name AS candidateName,
      t.title AS testTitle,
      t.type AS testType,
      t.passing_score
    FROM test_results tr
    JOIN test_assignments ta ON ta.id = tr.assignment_id
    JOIN applications a ON a.id = ta.application_id
    JOIN tests t ON t.id = ta.test_id
    
  `);

  console.log(`📌 FOUND ${rows.length} HISTORICAL TEST RESULTS NEEDING AI SUMMARY GENERATION.`);

  let count = 0;
  for (const row of rows) {
    try {
      const [ansRows] = await db.query(`
        SELECT ta.score, tq.points AS max_points, tq.question_type 
        FROM test_answers ta
        JOIN test_questions tq ON tq.id = ta.question_id
        WHERE ta.assignment_id = ?
      `, [row.assignment_id]);

      const summary = await generateSummary({
        candidateName: row.candidateName || 'Ứng viên',
        testTitle: row.testTitle,
        testType: row.testType,
        answers: ansRows,
        totalScore: row.total_score || 0,
        maxScore: row.max_score || 100,
        percentage: row.percentage || 0,
        passed: row.passed === 1,
        passingScore: row.passing_score || 60
      });

      await db.query('UPDATE test_results SET ai_summary = ? WHERE id = ?', [summary, row.result_id]);
      count++;
      console.log(`  - [${count}/${rows.length}] Generated AI summary for ${row.candidateName} (${row.testTitle})`);
    } catch (err) {
      console.error(`❌ Failed for result ${row.result_id}:`, err.message);
    }
  }

  console.log(`
🎉 FINISHED BACKFILL! ${count}/${rows.length} HISTORICAL TEST RESULTS NOW HAVE AI SUMMARY!`);
}

syncAllAiSummaries().then(() => process.exit(0));
