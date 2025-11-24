const axios = require("axios");

class ChatGPTService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiUrl = "https://api.openai.com/v1/chat/completions";
    this.model = process.env.OPENAI_MODEL || "gpt-3.5-turbo";
    this.timeout = 30000;
  }

  /**
   * Generate keywords from custom topic using ChatGPT
   * @param {string} customTopic - User's custom topic
   * @returns {Promise<string>} - Generated keywords for evaluation
   */
  async generateKeywords(customTopic) {
    try {
      if (!this.apiKey) {
        throw new Error("OpenAI API key is not configured");
      }

      const prompt = `Kamu adalah asisten yang membantu membuat kriteria penilaian untuk latihan public speaking dalam bahasa Indonesia.

Topic yang dipilih user: "${customTopic}"

Buatlah 5-10 kata kunci atau frasa penting yang harus ada dalam presentasi tentang topic ini. Kata kunci ini akan digunakan untuk menilai apakah pembicara memahami dan menyampaikan poin-poin penting dari topic tersebut.

Format jawaban: Berikan daftar kata kunci yang dipisahkan dengan koma, tanpa numbering atau bullet points.

Contoh jawaban: "perubahan iklim, pemanasan global, emisi karbon, energi terbarukan, dampak lingkungan, solusi berkelanjutan"`;

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that generates evaluation keywords for public speaking practice in Indonesian language.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 300,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: this.timeout,
        }
      );

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error("Invalid response from ChatGPT");
      }

      const keywords = response.data.choices[0].message.content.trim();

      return keywords;
    } catch (error) {
      console.error("ChatGPT Service Error:", error.message);

      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.error?.message || error.response.statusText;

        if (status === 401) {
          throw new Error("OpenAI API key tidak valid");
        } else if (status === 429) {
          throw new Error(
            "OpenAI API rate limit exceeded. Silakan coba beberapa saat lagi."
          );
        } else if (status === 500) {
          throw new Error(
            "OpenAI service sedang bermasalah. Silakan coba lagi nanti."
          );
        } else {
          throw new Error(`ChatGPT Error: ${message}`);
        }
      } else if (error.request) {
        throw new Error(
          "ChatGPT service tidak merespons. Silakan coba lagi nanti."
        );
      } else {
        throw new Error(`Error generating keywords: ${error.message}`);
      }
    }
  }

  async generateSuggestions(videoResult, audioResult, level) {
    try {
      if (!this.apiKey) {
        throw new Error("OpenAI API key is not configured");
      }

      // Helper function untuk generate default feedback jika ChatGPT miss indicator
      const generateDefaultFeedback = (indicator, data, lvl) => {
        const feedbackMap = {
          tempo: {
            status: data.tempo.score >= 4 ? 'baik' : data.tempo.score >= 3 ? 'cukup' : 'perlu_perbaikan',
            feedback: `Tempo bicara Anda ${data.tempo.wpm} kata/menit termasuk kategori ${data.tempo.category}. ${data.tempo.score >= 4 ? 'Kecepatan ini ideal untuk presentasi, memungkinkan audiens mengikuti dengan nyaman.' : 'Tempo ini perlu disesuaikan agar lebih efektif.'} ${data.tempo.has_long_pause ? 'Terdapat jeda panjang yang bisa mengurangi momentum presentasi.' : 'Tempo cukup konsisten tanpa jeda berlebihan.'}`,
            saran: [
              `Pertahankan tempo di kisaran ${data.tempo.category === 'Lambat' ? '110-120' : data.tempo.category === 'Cepat' ? '130-140' : '120-130'} kata/menit`,
              'Latihan membaca teks 200 kata dengan timer, evaluasi konsistensi tempo',
              'Gunakan jeda 2-3 detik setelah poin penting untuk emphasis',
              'Rekam presentasi dan analisis bagian yang terlalu cepat/lambat'
            ]
          },
          artikulasi: {
            status: data.artikulasi.score >= 4 ? 'baik' : data.artikulasi.score >= 3 ? 'cukup' : 'perlu_perbaikan',
            feedback: `Artikulasi Anda berada pada kategori ${data.artikulasi.category} dengan PER ${data.artikulasi.per}%. ${data.artikulasi.per > 150 ? 'Nilai PER yang tinggi mengindikasikan artikulasi yang kurang jelas dan perlu perbaikan signifikan.' : data.artikulasi.per > 130 ? 'PER cukup tinggi, ada ruang untuk peningkatan kejelasan pengucapan.' : 'Artikulasi sudah baik dan jelas.'} ${data.artikulasi.filler_count > 0 ? `Terdeteksi ${data.artikulasi.filler_count} kata pengisi (${data.artikulasi.filler_words.join(', ')}) yang mengganggu kelancaran.` : 'Tidak ada kata pengisi yang mengganggu.'}`,
            saran: [
              'Latihan tongue twister 5 menit setiap pagi untuk melatih otot artikulasi',
              'Fokus pengucapan konsonan di akhir kata (p, t, k, s)',
              'Rekam dan dengarkan ulang untuk identifikasi kata yang kurang jelas',
              'Target: turunkan PER ke <140% dalam 2 minggu dengan latihan konsisten',
              'Hindari terburu-buru, prioritaskan kejelasan over kecepatan'
            ]
          },
          kontak_mata: {
            status: data.kontak_mata.score >= 4 ? 'baik' : data.kontak_mata.score >= 3 ? 'cukup' : 'perlu_perbaikan',
            feedback: `Kontak mata Anda mendapat skor ${data.kontak_mata.score}/5 dengan rating ${data.kontak_mata.rating}. Waktu pandangan menjauh ${data.kontak_mata.gaze_away_time} detik ${data.kontak_mata.gaze_away_time <= 5 ? 'sangat baik, menunjukkan engagement yang kuat' : data.kontak_mata.gaze_away_time <= 10 ? 'cukup baik namun bisa ditingkatkan' : 'perlu perbaikan untuk membangun koneksi dengan audiens'}. Persentase pandangan ke center ${data.kontak_mata.center_percentage}% ${data.kontak_mata.center_percentage >= 70 ? 'menunjukkan fokus yang konsisten' : 'perlu ditingkatkan untuk engagement lebih baik'}.`,
            saran: [
              'Latihan berbicara dengan 3-4 objek berbeda di ruangan, rotasi setiap 3-5 detik',
              'Target: kurangi waktu pandang menjauh menjadi <5 detik',
              'Praktik teknik "triangle eye contact" untuk variasi natural',
              'Saat latihan, bayangkan audiens di berbagai titik ruangan',
              'Rekam video dan hitung durasi eye contact vs gaze away'
            ]
          },
          kesesuaian_topik: {
            status: data.kesesuaian_topik?.score >= 4 ? 'baik' : data.kesesuaian_topik?.score >= 3 ? 'cukup' : 'perlu_perbaikan',
            feedback: `Kesesuaian topik mendapat skor ${data.kesesuaian_topik?.score || 0}/5. ${data.kesesuaian_topik?.score >= 4 ? 'Konten Anda sangat relevan dengan topik yang diberikan, menunjukkan pemahaman yang baik.' : data.kesesuaian_topik?.score >= 3 ? 'Konten cukup relevan namun bisa lebih fokus dan mendalam.' : 'Konten kurang sesuai dengan topik, perlu peningkatan fokus dan relevansi.'} ${data.kesesuaian_topik?.matched_keywords?.length > 0 ? `Keyword yang cocok: ${data.kesesuaian_topik.matched_keywords.join(', ')}.` : 'Perlu lebih banyak keyword relevan dalam konten.'}`,
            saran: [
              'Buat outline sebelum presentasi dengan 3-5 poin utama yang relevan',
              'Research mendalam tentang topik, catat 10-15 keyword penting',
              'Latihan impromptu speech 2 menit dengan keyword yang ditentukan',
              'Validasi setiap poin: apakah ini relevan dengan topik utama?',
              'Minta feedback dari orang lain tentang relevansi konten Anda'
            ]
          },
          struktur: {
            status: data.struktur?.score >= 4 ? 'baik' : data.struktur?.score >= 3 ? 'cukup' : 'perlu_perbaikan',
            feedback: `Struktur presentasi Anda mendapat skor ${data.struktur?.score || 0}/5 (${data.struktur?.category || 'N/A'}). ${data.struktur?.has_opening ? '✓ Pembukaan ada' : '✗ Pembukaan kurang jelas'}, ${data.struktur?.has_content ? '✓ Isi ada' : '✗ Isi kurang jelas'}, ${data.struktur?.has_closing ? '✓ Penutup ada' : '✗ Penutup kurang jelas'}. ${data.struktur?.score >= 4 ? 'Struktur sudah sistematis dan mudah diikuti.' : 'Struktur perlu diperjelas agar audiens mudah mengikuti alur presentasi.'}`,
            saran: [
              'Gunakan framework "Problem-Solution-Action" atau "Past-Present-Future"',
              'Buka dengan hook menarik (pertanyaan, fakta, atau story)',
              'Transisi jelas antar bagian dengan signpost ("pertama...", "selanjutnya...", "terakhir...")',
              'Tutup dengan call-to-action atau summary yang memorable',
              'Latihan dengan outline: alokasi waktu 15% pembuka, 70% isi, 15% penutup'
            ]
          },
          jeda: {
            status: data.tempo.has_long_pause ? 'perlu_perbaikan' : 'baik',
            feedback: `${data.tempo.has_long_pause ? 'Terdeteksi jeda panjang yang tidak strategis dalam presentasi Anda.' : 'Tidak ada jeda panjang yang mengganggu.'} ${data.tempo.has_long_pause ? 'Jeda berlebihan bisa membuat audiens kehilangan fokus dan mengurangi momentum presentasi. Penting untuk menggunakan jeda secara strategis.' : 'Anda berhasil menjaga momentum dengan baik. Namun, jeda strategis bisa ditambahkan untuk penekanan.'} Di level ${lvl}, kemampuan menggunakan jeda dengan tepat sangat penting untuk retorika yang efektif.`,
            saran: [
              'Gunakan jeda 2-3 detik setelah statement penting untuk memberi waktu audiens mencerna',
              'Latihan: tandai 3-5 titik jeda strategis dalam outline presentasi',
              'Hindari jeda saat transisi atau di tengah kalimat',
              'Praktik teknik "dramatic pause" untuk meningkatkan impact',
              'Rekam dan evaluasi: jeda Anda sudah strategis atau justru mengganggu?'
            ]
          },
          first_impression: {
            status: data.ekspresi.first_impression.expression === 'Happy' ? 'baik' : 'perlu_perbaikan',
            feedback: `First impression Anda menampilkan ekspresi ${data.ekspresi.first_impression.expression} ${data.ekspresi.first_impression.expression === 'Happy' ? 'yang sangat positif. Ini excellent untuk membangun rapport dengan audiens sejak awal.' : 'yang perlu diperbaiki. Ekspresi awal sangat menentukan persepsi audiens terhadap Anda.'} Di detik-detik pertama, audiens membentuk kesan yang akan mempengaruhi bagaimana mereka menerima pesan Anda. ${data.ekspresi.first_impression.expression === 'Happy' ? 'Pertahankan energi positif ini!' : 'Usahakan memulai dengan ekspresi lebih positif dan antusias.'}`,
            saran: [
              'Sebelum mulai, tarik napas dalam dan tersenyum genuine',
              'Praktik "power posing" 2 menit sebelum presentasi untuk boost confidence',
              'Mulai dengan enthusiastic greeting untuk set positive tone',
              'Latihan di depan cermin: evaluasi ekspresi 10 detik pertama',
              'Think positive thought sebelum mulai - ekspresi akan follow naturally'
            ]
          },
          ekspresi: {
            status: data.ekspresi.dominant === 'Happy' && data.ekspresi.happy_percentage >= 60 ? 'baik' : data.ekspresi.happy_percentage >= 40 ? 'cukup' : 'perlu_perbaikan',
            feedback: `Ekspresi wajah dominan Anda adalah ${data.ekspresi.dominant} dengan ${data.ekspresi.happy_percentage}% waktu menunjukkan kebahagiaan. ${data.ekspresi.happy_percentage >= 60 ? 'Ini sangat baik, menciptakan suasana positif dan engaging.' : data.ekspresi.happy_percentage >= 40 ? 'Ekspresi cukup positif namun bisa lebih variatif sesuai konten.' : 'Ekspresi perlu lebih ekspresif dan variatif.'} Skor ekspresi ${data.ekspresi.score}/10 menunjukkan ${data.ekspresi.score >= 7 ? 'performa yang kuat' : data.ekspresi.score >= 5 ? 'ada ruang improvement' : 'perlu peningkatan signifikan'}. Ekspresi yang tepat membuat pesan lebih memorable.`,
            saran: [
              'Variasikan ekspresi sesuai konten: serius saat data penting, antusias saat solusi, concern saat masalah',
              'Latihan facial expression exercises 5 menit/hari di depan cermin',
              'Target: maintain positive expression 70% waktu, 30% variasi sesuai konteks',
              'Rekam dan watch back - apakah ekspresi match dengan message?',
              'Practice microexpressions untuk natural authenticity'
            ]
          },
          gestur: {
            status: data.gestur.score >= 7 && !data.gestur.nervous_gestures ? 'baik' : data.gestur.score >= 5 ? 'cukup' : 'perlu_perbaikan',
            feedback: `Gestur Anda mendapat skor ${data.gestur.score}/10 dengan kategori ${data.gestur.category}. Hand activity ${data.gestur.hand_activity}% menunjukkan ${data.gestur.hand_activity >= 40 ? 'engagement yang baik dengan gestur' : data.gestur.hand_activity >= 20 ? 'gestur yang cukup namun bisa lebih ekspresif' : 'gestur yang minimal dan perlu ditingkatkan'}. ${data.gestur.nervous_gestures ? '⚠️ Terdeteksi nervous gestures yang perlu dikontrol.' : 'Tidak ada nervous gestures terdeteksi, ini bagus.'} Gestur yang efektif memperkuat pesan dan membuat presentasi lebih dynamic.`,
            saran: [
              'Praktik purposeful gestures: open palms untuk welcoming, pointing untuk emphasis, counting dengan jari',
              'Hindari nervous gestures: fidgeting, touching face/hair, pocket hands',
              'Latihan: assign specific gestures untuk setiap key point dalam outline',
              'Gunakan "gesture box" (dari waist ke shoulder level) untuk natural movement',
              'Target: increase hand activity ke 40-60% dengan meaningful gestures',
              'Record dan review: apakah gestur enhance atau distract dari message?'
            ]
          },
          kata_pengisi: {
            status: data.artikulasi.filler_count === 0 ? 'baik' : data.artikulasi.filler_count <= 3 ? 'cukup' : 'perlu_perbaikan',
            feedback: `Terdeteksi ${data.artikulasi.filler_count} kata pengisi ${data.artikulasi.filler_count > 0 ? `(${data.artikulasi.filler_words.join(', ')})` : ''} dalam presentasi Anda. ${data.artikulasi.filler_count === 0 ? 'Excellent! Tidak ada kata pengisi yang mengganggu kelancaran presentasi.' : data.artikulasi.filler_count <= 3 ? 'Jumlah ini masih wajar namun bisa diminimalkan.' : 'Terlalu banyak kata pengisi yang mengurangi kredibilitas dan profesionalisme.'} Kata pengisi menunjukkan keraguan dan mengganggu flow presentasi. Di level ${lvl}, minimalisasi kata pengisi menjadi penting.`,
            saran: [
              'Replace filler words dengan strategic pause (diam 1-2 detik)',
              'Latihan awareness: minta teman hitung setiap kali Anda pakai filler',
              'Slow down tempo sedikit - filler sering muncul saat terburu-buru',
              'Prepare better: outline yang jelas mengurangi need untuk filler',
              'Target: maksimal 1 filler per 2 menit presentasi',
              'Practice mindfulness - notice saat akan pakai filler dan stop'
            ]
          },
          kata_tidak_senonoh: {
            status: data.profanity.has_profanity ? 'perlu_perbaikan' : 'baik',
            feedback: `${data.profanity.has_profanity ? `⚠️ PERINGATAN: Terdeteksi kata tidak senonoh (${data.profanity.words.join(', ')}) dalam presentasi Anda.` : 'Tidak ada kata tidak senonoh terdeteksi.'} ${data.profanity.has_profanity ? 'Penggunaan kata tidak senonoh sangat merusak profesionalisme dan kredibilitas Anda sebagai pembicara. Ini harus segera dihilangkan dari vocabulary presentasi Anda.' : 'Excellent! Anda menjaga profesionalisme dengan vocabulary yang appropriate.'} Bahasa yang digunakan mencerminkan profesionalisme dan respect terhadap audiens.`,
            saran: data.profanity.has_profanity ? [
              '🚨 PRIORITAS TINGGI: Eliminasi total kata tidak senonoh dari vocabulary',
              'Ganti dengan alternatif yang professional dan appropriate',
              'Latihan self-control: pause sebelum bicara, think before speak',
              'Build vocabulary bank dengan kata-kata positif dan professional',
              'Jika frustrated, gunakan professional expressions: "menantang", "sulit", "kompleks"',
              'Practice dalam low-stakes environment sampai habit terbentuk'
            ] : [
              'Pertahankan vocabulary yang professional dan appropriate',
              'Continue building positive language repertoire',
              'Be mindful of context - adjust formality level sesuai audiens'
            ]
          }
        };

        return feedbackMap[indicator] || {
          status: 'cukup',
          feedback: 'Data untuk indikator ini sedang diproses.',
          saran: ['Silakan lanjutkan latihan dan perhatikan aspek ini di sesi berikutnya.']
        };
      };

      // Definisi indikator berdasarkan level
      const levelIndicators = {
        1: ['tempo', 'artikulasi', 'jeda', 'first_impression', 'ekspresi', 'gestur', 'kata_pengisi', 'kata_tidak_senonoh'],
        2: ['tempo', 'artikulasi', 'kontak_mata', 'jeda', 'first_impression', 'ekspresi', 'gestur', 'kata_pengisi', 'kata_tidak_senonoh'],
        3: ['tempo', 'artikulasi', 'kontak_mata', 'kesesuaian_topik', 'jeda', 'first_impression', 'ekspresi', 'gestur', 'kata_pengisi', 'kata_tidak_senonoh'],
        4: ['tempo', 'artikulasi', 'kontak_mata', 'kesesuaian_topik', 'jeda', 'first_impression', 'ekspresi', 'gestur', 'kata_pengisi', 'kata_tidak_senonoh'],
        5: ['tempo', 'artikulasi', 'kontak_mata', 'kesesuaian_topik', 'struktur', 'jeda', 'first_impression', 'ekspresi', 'gestur', 'kata_pengisi', 'kata_tidak_senonoh']
      };

      const activeIndicators = levelIndicators[level] || levelIndicators[5];

      const analysisData = {
        tempo: {
          score: audioResult.result.tempo.score,
          wpm: audioResult.result.tempo.words_per_minute,
          category: audioResult.result.tempo.category,
          has_long_pause: audioResult.result.tempo.has_long_pause
        },
        artikulasi: {
          score: audioResult.result.articulation.score,
          category: audioResult.result.articulation.category,
          per: audioResult.result.articulation.details.per,
          filler_count: audioResult.result.articulation.filler_count,
          filler_words: audioResult.result.articulation.filler_words
        },
        kontak_mata: {
          score: videoResult.result.analysis_results.eye_contact.score,
          rating: videoResult.result.analysis_results.eye_contact.rating,
          gaze_away_time: videoResult.result.analysis_results.eye_contact.summary.gaze_away_time,
          center_percentage: videoResult.result.analysis_results.eye_contact.summary.center_percentage
        },
        ekspresi: {
          score: videoResult.result.analysis_results.facial_expression.score,
          dominant: videoResult.result.analysis_results.facial_expression.dominant_expression,
          first_impression: videoResult.result.analysis_results.facial_expression.first_impression,
          happy_percentage: videoResult.result.analysis_results.facial_expression.overall_summary.happy_percentage
        },
        gestur: {
          score: videoResult.result.analysis_results.gesture.score,
          category: videoResult.result.analysis_results.gesture.movement_category,
          hand_activity: videoResult.result.analysis_results.gesture.summary.hand_activity_percentage,
          nervous_gestures: videoResult.result.analysis_results.gesture.details.nervous_gestures_detected
        },
        struktur: audioResult.result.structure ? {
          score: audioResult.result.structure.score,
          category: audioResult.result.structure.category,
          has_opening: audioResult.result.structure.has_opening,
          has_content: audioResult.result.structure.has_content,
          has_closing: audioResult.result.structure.has_closing
        } : null,
        kesesuaian_topik: audioResult.result.keywords ? {
          score: audioResult.result.keywords.score,
          matched_keywords: audioResult.result.keywords.matched_keywords || []
        } : null,
        profanity: {
          has_profanity: audioResult.result.profanity.has_profanity,
          words: audioResult.result.profanity.profane_words || []
        }
      };

      // Build data analisis string berdasarkan indikator aktif
      let dataAnalisisText = `**LEVEL ${level} - DATA ANALISIS:**\n`;

      if (activeIndicators.includes('tempo')) {
        dataAnalisisText += `- Tempo: ${analysisData.tempo.score}/5 (${analysisData.tempo.wpm} kata/menit, ${analysisData.tempo.category})\n`;
      }

      if (activeIndicators.includes('artikulasi')) {
        dataAnalisisText += `- Artikulasi: ${analysisData.artikulasi.score}/5 (${analysisData.artikulasi.category}, PER: ${analysisData.artikulasi.per}%)\n`;
      }

      if (activeIndicators.includes('kontak_mata')) {
        dataAnalisisText += `- Kontak Mata: ${analysisData.kontak_mata.score}/5 (${analysisData.kontak_mata.rating}, waktu pandang menjauh: ${analysisData.kontak_mata.gaze_away_time}s)\n`;
      }

      if (activeIndicators.includes('first_impression')) {
        dataAnalisisText += `- First Impression: ${analysisData.ekspresi.first_impression.expression}\n`;
      }

      if (activeIndicators.includes('ekspresi')) {
        dataAnalisisText += `- Ekspresi Wajah: ${analysisData.ekspresi.score}/10 (${analysisData.ekspresi.dominant}, ${analysisData.ekspresi.happy_percentage}% happy)\n`;
      }

      if (activeIndicators.includes('gestur')) {
        dataAnalisisText += `- Gestur: ${analysisData.gestur.score}/10 (${analysisData.gestur.category}, nervous: ${analysisData.gestur.nervous_gestures})\n`;
      }

      if (activeIndicators.includes('kesesuaian_topik') && analysisData.kesesuaian_topik) {
        dataAnalisisText += `- Kesesuaian Topik: ${analysisData.kesesuaian_topik.score}/5\n`;
      }

      if (activeIndicators.includes('struktur') && analysisData.struktur) {
        dataAnalisisText += `- Struktur: ${analysisData.struktur.score}/5 (${analysisData.struktur.category})\n`;
      }

      if (activeIndicators.includes('kata_pengisi')) {
        dataAnalisisText += `- Kata Pengisi: ${analysisData.artikulasi.filler_count} kali ${analysisData.artikulasi.filler_count > 0 ? `(${analysisData.artikulasi.filler_words.join(', ')})` : ''}\n`;
      }

      if (activeIndicators.includes('jeda')) {
        dataAnalisisText += `- Jeda Panjang: ${analysisData.tempo.has_long_pause ? 'Ada' : 'Tidak ada'}\n`;
      }

      if (activeIndicators.includes('kata_tidak_senonoh')) {
        dataAnalisisText += `- Kata Tidak Senonoh: ${analysisData.profanity.has_profanity ? `Ada (${analysisData.profanity.words.join(', ')})` : 'Tidak ada'}\n`;
      }

      // Build list indikator yang harus ada dalam response
      const requiredIndicatorsText = activeIndicators
        .filter(ind => !['kata_tidak_senonoh'].includes(ind)) // kata_tidak_senonoh hanya warning
        .join(', ');

      const prompt = `Kamu adalah coach public speaker profesional yang memberikan feedback konstruktif, spesifik, dan actionable dalam bahasa Indonesia.

${dataAnalisisText}

**KONTEKS LEVEL:**
Level ${level} dari 5 level latihan public speaking. ${level === 1 ? 'Ini adalah level dasar, fokus pada fundamental seperti tempo dan artikulasi.' :
          level === 2 ? 'Level menengah, mulai memperhatikan kontak mata dan interaksi visual.' :
            level === 3 ? 'Level menengah-lanjut, menambahkan kesesuaian topik dan konten.' :
              level === 4 ? 'Level lanjut, standar penilaian lebih ketat.' :
                'Level expert, evaluasi menyeluruh dengan standar profesional.'
        }

**INSTRUKSI:**
Berikan feedback untuk SETIAP indikator penilaian yang aktif di level ini dalam format JSON. Untuk setiap indikator, berikan:

1. **status**: "baik", "cukup", atau "perlu_perbaikan"

2. **feedback**: Analisis mendalam (3-4 kalimat) yang mencakup:
   - Kondisi aktual dengan angka spesifik dari data
   - Dampak dari kondisi tersebut terhadap performa
   - Perbandingan dengan standar ideal
   - Diagnosis masalah jika ada

3. **saran**: Langkah konkret dan actionable (3-5 poin bullet) yang mencakup:
   - Teknik spesifik yang bisa langsung dipraktikkan
   - Latihan konkret dengan durasi/repetisi
   - Tips praktis yang mudah diingat
   - Target improvement yang jelas
   - Contoh praktis jika relevan

**CONTOH FEEDBACK YANG BAIK:**

❌ TERLALU GENERAL:
"Tempo bicara Anda sudah baik. Pertahankan tempo ini."

✅ SPESIFIK & ACTIONABLE:
"Tempo bicara Anda 121 kata/menit berada di kategori Sedang yang sangat ideal untuk presentasi. Kecepatan ini membuat audiens nyaman mengikuti penjelasan Anda tanpa merasa terburu-buru atau bosan. Anda berhasil menjaga konsistensi tempo sepanjang presentasi, menunjukkan kontrol yang baik."

Saran:
• Variasikan tempo untuk penekanan: perlambat hingga 100 wpm saat menyampaikan poin penting, percepat hingga 130-140 wpm saat transisi
• Latihan membaca teks 200 kata dengan stopwatch, target 90-100 detik (120-130 wpm)
• Gunakan teknik "pause-emphasize-continue" untuk poin krusial
• Rekam diri sendiri dan tandai bagian yang perlu variasi tempo

**INDIKATOR YANG HARUS ADA (sesuai level ${level}):**
${requiredIndicatorsText}

${activeIndicators.includes('kata_tidak_senonoh') && analysisData.profanity.has_profanity ?
          `⚠️ PERINGATAN: Terdeteksi kata tidak senonoh: ${analysisData.profanity.words.join(', ')}. Berikan feedback tegas namun konstruktif dengan dampak negatifnya dan langkah perbaikan konkret.` : ''}

Tambahkan juga:

- **kesimpulan_umum**: Analisis komprehensif (4-5 kalimat) yang mencakup:
  * Highlight pencapaian terbaik dengan data
  * Area yang paling memerlukan perbaikan
  * Pola atau tema yang terlihat dari seluruh indikator
  * Prediksi potensi jika aspek tertentu diperbaiki
  * Motivasi dan next step yang jelas

- **prioritas_perbaikan**: Array 3-4 item dengan format:
  * "[Indikator]: [Masalah spesifik] - [Target improvement konkret]"
  * Contoh: "Artikulasi: PER 164% terlalu tinggi - Target turunkan ke <140% dalam 2 minggu"

- **apresiasi**: Array 3-4 item dengan format:
  * "[Indikator]: [Pencapaian spesifik dengan angka] - [Dampak positifnya]"
  * Contoh: "Tempo: 121 wpm sangat ideal - Audiens bisa mengikuti dengan nyaman"

- **tips_latihan**: Array 3-4 latihan konkret dengan format:
  * "[Nama Latihan]: [Deskripsi singkat] - [Durasi/Frekuensi] - [Target hasil]"
  * Contoh: "Mirror Practice: Latihan di depan cermin 10 menit/hari fokus ekspresi - Target: 70% waktu tersenyum natural"

**FORMAT OUTPUT - WAJIB LENGKAP:**
Kembalikan HANYA JSON tanpa markdown, tanpa backticks, tanpa preamble. 

CRITICAL: Struktur JSON HARUS berisi SEMUA indikator berikut (sesuai level ${level}):
${activeIndicators.map(ind => `- "${ind}": { status, feedback, saran }`).join('\n')}
- "kesimpulan_umum": "..."
- "prioritas_perbaikan": [...]
- "apresiasi": [...]
- "tips_latihan": [...]

Contoh struktur (HARUS LENGKAP):
{
  ${activeIndicators.filter(ind => ind !== 'kata_tidak_senonoh').slice(0, 3).map(ind =>
            `"${ind}": {
    "status": "baik/cukup/perlu_perbaikan",
    "feedback": "...(3-4 kalimat detail dengan angka spesifik)...",
    "saran": ["...", "...", "...", "..."]
  }`).join(',\n  ')},
  ... (SEMUA indikator lainnya WAJIB ada),
  "kesimpulan_umum": "...",
  "prioritas_perbaikan": ["...", "...", "..."],
  "apresiasi": ["...", "...", "..."],
  "tips_latihan": ["...", "...", "..."]
}

PENTING: 
- WAJIB menggunakan data angka spesifik dari analisis
- WAJIB menyertakan SEMUA ${activeIndicators.length} indikator aktif di level ${level}
- Jika ada indikator yang terlewat, response akan dianggap INVALID
- Feedback harus diagnostik, bukan hanya deskriptif
- Saran harus actionable dengan langkah konkret, bukan general advice
- Setiap saran harus bisa langsung dipraktikkan hari ini
- Gunakan analogi atau contoh untuk memperjelas jika perlu
- Sesuaikan tingkat kritik dengan level (level rendah lebih encouraging, level tinggi lebih kritis)
- Hindari kalimat klise seperti "pertahankan", "tingkatkan", "perbaiki" tanpa detail

DOUBLE CHECK sebelum return:
✓ Semua ${activeIndicators.length} indikator ada?
✓ Setiap indikator punya status, feedback (3-4 kalimat), dan saran (array 3-5 item)?
✓ Ada kesimpulan_umum, prioritas_perbaikan, apresiasi, tips_latihan?
✓ Format JSON valid tanpa markdown?`;

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: "system",
              content: `Kamu adalah coach public speaker profesional yang HARUS memberikan feedback lengkap untuk SEMUA indikator.

CRITICAL RULES:
1. Response HARUS dalam format JSON yang valid
2. WAJIB menyertakan SEMUA ${activeIndicators.length} indikator: ${activeIndicators.join(', ')}
3. Setiap indikator WAJIB punya: status, feedback (3-4 kalimat), saran (array 3-5 item)
4. WAJIB ada: kesimpulan_umum, prioritas_perbaikan, apresiasi, tips_latihan
5. TIDAK BOLEH skip indikator apapun
6. Format: HANYA JSON murni, TANPA markdown, TANPA backticks, TANPA teks tambahan

Jika response tidak lengkap atau missing indikator, itu INVALID dan akan di-reject.`
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 4000,
          response_format: { type: "json_object" }
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`
          },
          timeout: this.timeout
        }
      );

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error("Invalid response from ChatGPT");
      }

      let jsonResponse = response.data.choices[0].message.content.trim();

      // Bersihkan markdown jika ada
      jsonResponse = jsonResponse.replace(/"""json\n?/g, '').replace(/"""\n?/g, '').trim();

      // Parse JSON
      const suggestions = JSON.parse(jsonResponse);

      // Validasi bahwa semua indikator aktif ada dalam response
      const missingIndicators = activeIndicators.filter(
        ind => !['kata_tidak_senonoh'].includes(ind) && !suggestions[ind]
      );

      if (missingIndicators.length > 0) {
        console.warn(`⚠️ Missing indicators in response: ${missingIndicators.join(', ')}`);

        // Generate default feedback untuk indikator yang missing
        missingIndicators.forEach(indicator => {
          suggestions[indicator] = generateDefaultFeedback(indicator, analysisData, level);
        });

        console.log('✅ Added default feedback for missing indicators');
      }

      return suggestions;

    } catch (error) {
      console.error("ChatGPT Service Error:", error.message);

      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.error?.message || error.response.statusText;

        if (status === 401) {
          throw new Error("OpenAI API key tidak valid");
        } else if (status === 429) {
          throw new Error("OpenAI API rate limit exceeded. Silakan coba beberapa saat lagi.");
        } else if (status === 500) {
          throw new Error("OpenAI service sedang bermasalah. Silakan coba lagi nanti.");
        } else {
          throw new Error(`ChatGPT Error: ${message}`);
        }
      } else if (error.request) {
        throw new Error("ChatGPT service tidak merespons. Silakan coba lagi nanti.");
      } else if (error.name === 'SyntaxError') {
        throw new Error("Failed to parse JSON response from ChatGPT");
      } else {
        throw new Error(`Error generating suggestions: ${error.message}`);
      }
    }
  }

  /**
   * Validate if generated keywords are appropriate
   * @param {string} keywords - Generated keywords string
   * @returns {boolean}
   */
  validateKeywords(keywords) {
    if (!keywords || typeof keywords !== "string") {
      return false;
    }

    const trimmed = keywords.trim();

    return trimmed.length >= 10 && trimmed.includes(",");
  }
}

module.exports = new ChatGPTService();
