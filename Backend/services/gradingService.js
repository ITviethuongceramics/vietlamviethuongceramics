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
function generateFallbackSummary({ candidateName, testTitle, testType, totalScore, maxScore, percentage, passed, passingScore, answers = [] }) {
  const totalQuestions = answers.length;
  let correctIndices = [];
  let incorrectIndices = [];

  answers.forEach((a, idx) => {
    const qNum = idx + 1;
    const score = a.score || 0;
    const maxP = a.max_points || 10;
    if (score > 0 && score >= (maxP * 0.6)) {
      correctIndices.push(qNum);
    } else {
      incorrectIndices.push(qNum);
    }
  });

  const statusStr = passed ? 'đạt yêu cầu tuyển dụng' : 'không đạt yêu cầu tuyển dụng';
  let detailText = '';

  if (totalQuestions > 0 && correctIndices.length > 0) {
    if (incorrectIndices.length === 0) {
      detailText = `Ứng viên ${candidateName} đã thể hiện sự xuất sắc tuyệt đối khi trả lời chính xác tất cả các câu hỏi trong bài test.`;
    } else {
      const correctRange = correctIndices.length === 1 ? `câu hỏi số ${correctIndices[0]}` : `các câu hỏi từ ${correctIndices[0]} đến ${correctIndices[correctIndices.length - 1]}`;
      const incorrectList = incorrectIndices.join(', ');
      detailText = `Ứng viên ${candidateName} đã thể hiện sự tự tin và kiến thức vững chắc trong phần lớn các câu hỏi của bài test, đặc biệt là ${correctRange}. Tuy nhiên, ứng viên còn hạn chế ở một số câu hỏi quan trọng, đặc biệt là câu ${incorrectList}, nơi chưa đạt được điểm tối đa.`;
    }
  } else {
    detailText = `Ứng viên ${candidateName} đã hoàn thành phần thi nhưng cần trau dồi thêm về kiến thức chuyên môn.`;
  }

  const conclusion = passed 
    ? `Với tổng điểm ${percentage}%, ứng viên ${statusStr} và thể hiện tiềm năng đóng góp tốt cho vị trí ${testTitle}.` 
    : `Với tổng điểm ${percentage}%, ứng viên ${statusStr}, nhưng vẫn có tiềm năng phát triển nếu được đào tạo và huấn luyện thêm.`;

  return `${detailText} Điều này cho thấy ứng viên cần tiếp tục cải thiện kỹ năng chuyên môn để đáp ứng tốt hơn yêu cầu công việc. ${conclusion}`;
}

async function generateSummary({ candidateName, testTitle, testType, answers = [], totalScore, maxScore, percentage, passed, passingScore }) {
  try {
    const answerSummary = answers.map((a, i) =>
      `Câu ${i + 1} (${a.question_type || 'câu hỏi'}): ${a.score}/${a.max_points} điểm${a.feedback ? ' — ' + a.feedback : ''}`
    ).join('\n');

    const prompt = `
Bạn là Giám đốc Nhân sự (HR Director). Hãy viết nhận xét đánh giá tổng hợp kết quả bài test tuyển dụng cho ứng viên.

Thông tin ứng viên & Bài test:
- Ứng viên: ${candidateName}
- Bài test / Vị trí: ${testTitle} (${testType})
- Tổng điểm: ${totalScore}/${maxScore} (${percentage}%)
- Điểm chuẩn yêu cầu: ${passingScore}%
- Kết quả chung: ${passed ? 'ĐẠT YÊU CẦU' : 'KHÔNG ĐẠT YÊU CẦU'}

Chi tiết điểm số từng câu:
${answerSummary}

YÊU CẦU VIẾT NHẬN XẾT:
1. Viết 1 đoạn văn từ 3-5 câu bằng tiếng Việt tự nhiên, sâu sắc, như Giám đốc Nhân sự nhận xét.
2. KHÔNG lặp lại các con số % khô cứng dạng "đạt 65% so với mức chuẩn 70%, 65/100 (65%)".
3. Phân tích cụ thể các câu ứng viên làm tốt (ví dụ: các câu từ câu X đến câu Y) và nêu rõ các câu ứng viên chưa đạt điểm tối đa (ví dụ: câu A, B, C).
4. Đưa ra lời khuyên hoặc tiềm năng phát triển của ứng viên đối với vị trí tuyển dụng.
5. Chỉ trả về duy nhất đoạn văn nhận xét, không kèm tiêu đề hay ký tự thừa.
`.trim();

    const completion = await groq.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      temperature: 0.3,
      messages:    [{ role: 'user', content: prompt }],
    });

    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error('Groq AI API Error, using Review B style fallback summary:', err.message);
    return generateFallbackSummary({ candidateName, testTitle, testType, totalScore, maxScore, percentage, passed, passingScore, answers });
  }
}

module.exports = { gradeTextAnswer, gradeSpeakingAnswer, generateSummary };
