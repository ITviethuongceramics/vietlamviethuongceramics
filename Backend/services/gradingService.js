const Groq   = require('groq-sdk');
const fs     = require('fs');
const path   = require('path');
if (!globalThis.File) {
  const { File } = require('buffer');
  globalThis.File = File;
}
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ============================================================
// Chấm câu tự luận / đọc hiểu bằng Groq LLM
// ============================================================
async function gradeTextAnswer({ question, answer, rubric, maxPoints, language = 'vi' }) {
  const prompt = `
Bạn là giám khảo chấm bài tuyển dụng. Hãy chấm câu trả lời sau và trả về JSON.

Câu hỏi: ${question}
Câu trả lời của ứng viên: ${answer}
Tiêu chí chấm: ${rubric || 'Chấm theo độ chính xác và đầy đủ nội dung'}
Điểm tối đa: ${maxPoints}
Ngôn ngữ bài thi: ${language === 'en' ? 'Tiếng Anh' : language === 'zh' ? 'Tiếng Trung' : 'Tiếng Việt'}

Trả về JSON theo đúng format sau (không thêm markdown, không thêm text ngoài JSON):
{
  "score": <số điểm thực nhận, kiểu number>,
  "max_score": ${maxPoints},
  "feedback": "<nhận xét ngắn gọn bằng tiếng Việt, tối đa 100 từ>",
  "is_correct": <true nếu đạt >= 60% điểm, false nếu không>
}
`.trim();

  const completion = await groq.chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    temperature: 0.2,
    messages:    [{ role: 'user', content: prompt }],
  });

  const text  = completion.choices[0].message.content.trim();
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// ============================================================
// Chấm bài nói (speaking) bằng Groq Whisper + LLM
// ============================================================
async function gradeSpeakingAnswer({ audioPath, prompt: speakingPrompt, maxPoints }) {
  // Bước 1: Transcribe audio bằng Groq Whisper
  let transcription = '';
  try {
  const { toFile } = require('groq-sdk');
const audioBuffer = fs.readFileSync(audioPath);
const ext = path.extname(audioPath).replace('.', '');
const file = await toFile(audioBuffer, `audio.${ext}`, { type: `audio/${ext}` });

const result = await groq.audio.transcriptions.create({
  file,
  model:           'whisper-large-v3-turbo',
  response_format: 'json',
  language:        'en',
});
    transcription = result.text || '';
  } catch (err) {
    console.error('Whisper transcription error:', err.message);
    transcription = '';
  }

  // Bước 2: Chấm điểm phát âm + nội dung bằng LLM
  const prompt = `
Bạn là giám khảo chấm bài thi nói tiếng Anh cho vị trí tuyển dụng.

Chủ đề / câu hỏi ứng viên cần nói: "${speakingPrompt}"
Nội dung ứng viên đã nói (transcription): "${transcription}"
Điểm tối đa: ${maxPoints}

Hãy chấm điểm theo thang sau:
- 90-100%: Nội dung đầy đủ, rõ ràng, tự nhiên, gần như người bản ngữ
- 70-89%:  Nội dung khá tốt, dễ hiểu, lỗi nhỏ không ảnh hưởng
- 50-69%:  Nội dung chấp nhận được, có một số lỗi rõ ràng
- 30-49%:  Nội dung khó hiểu, nhiều lỗi ảnh hưởng đến hiểu
- 0-29%:   Nội dung rất kém hoặc không liên quan chủ đề

Trả về JSON theo đúng format sau (không thêm markdown, không thêm text ngoài JSON):
{
  "score": <số điểm thực nhận, kiểu number>,
  "max_score": ${maxPoints},
  "pronunciation_percent": <phần trăm chất lượng 0-100>,
  "transcription": "${transcription}",
  "feedback": "<nhận xét bằng tiếng Việt, tối đa 100 từ>",
  "is_correct": <true nếu đạt >= 60% điểm>
}
`.trim();

  const completion = await groq.chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    temperature: 0.2,
    messages:    [{ role: 'user', content: prompt }],
  });

  const text  = completion.choices[0].message.content.trim();
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// ============================================================
// Tổng hợp nhận xét toàn bài bằng Groq LLM
// ============================================================
async function generateSummary({ candidateName, testTitle, testType, answers, totalScore, maxScore, percentage, passed, passingScore }) {
  const answerSummary = answers.map((a, i) =>
    `Câu ${i + 1} (${a.question_type}): ${a.score}/${a.max_points} điểm${a.feedback ? ' — ' + a.feedback : ''}`
  ).join('\n');

  const prompt = `
Bạn là HR manager. Hãy viết nhận xét tổng hợp kết quả bài test tuyển dụng.

Ứng viên: ${candidateName}
Bài test: ${testTitle} (${testType})
Tổng điểm: ${totalScore}/${maxScore} (${percentage}%)
Điểm đạt yêu cầu: ${passingScore}%
Kết quả: ${passed ? 'ĐẠT' : 'KHÔNG ĐẠT'}

Chi tiết từng câu:
${answerSummary}

Viết nhận xét tổng hợp bằng tiếng Việt, ngắn gọn 3-5 câu, khách quan, chuyên nghiệp.
Nêu điểm mạnh, điểm cần cải thiện và kết luận phù hợp với vị trí tuyển dụng.
Chỉ trả về đoạn văn nhận xét, không thêm tiêu đề hay format khác.
`.trim();

  const completion = await groq.chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    temperature: 0.3,
    messages:    [{ role: 'user', content: prompt }],
  });

  return completion.choices[0].message.content.trim();
}

module.exports = { gradeTextAnswer, gradeSpeakingAnswer, generateSummary };